"""
Smoke tests for /api/v2/plan endpoint.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    import api
    c = TestClient(api.app)
    r = c.post("/api/load-mock-data")
    assert r.status_code == 200
    r = c.post("/api/run-analysis")
    assert r.status_code == 200
    return c


def test_v2_plan_returns_200(client):
    r = client.get("/api/v2/plan")
    assert r.status_code == 200


def test_v2_plan_top_level_shape(client):
    data = client.get("/api/v2/plan").json()
    for key in ["hero", "kpis", "market_overlay", "moves_by_pillar",
                "pillar_order", "reviewer"]:
        assert key in data, f"Missing top-level key: {key}"


def test_v2_plan_hero_fields(client):
    hero = client.get("/api/v2/plan").json()["hero"]
    for f in ["expected_lift", "expected_lift_pct", "moves_count",
              "channels_moving", "channels_total", "spend_shift",
              "plan_confidence", "execute_by", "horizon_days"]:
        assert f in hero, f"Hero missing field: {f}"
    assert hero["plan_confidence"] in {"high", "directional", "inconclusive"}
    assert hero["channels_moving"] <= hero["channels_total"]


def test_v2_plan_kpis_strip(client):
    kpis = client.get("/api/v2/plan").json()["kpis"]
    assert len(kpis) == 5, "Plan KPI strip should be exactly 5 tiles"
    for tile in kpis:
        assert "label" in tile
        assert "value" in tile
        assert "format" in tile
    labels = [k["label"] for k in kpis]
    # The 5 tiles per the mockup
    assert "Expected lift" in labels
    assert "Channels moving" in labels
    assert "Spend shift" in labels
    assert "Plan confidence" in labels
    assert "Execute by" in labels


def test_v2_plan_pillar_order(client):
    data = client.get("/api/v2/plan").json()
    assert data["pillar_order"] == ["revenue_uplift", "cost_reduction", "cx_uplift"]


def test_v2_plan_moves_have_required_fields(client):
    data = client.get("/api/v2/plan").json()
    required = {"action_verb", "channel", "title", "detail",
                "current_spend", "recommended_spend", "spend_delta",
                "change_pct", "impact", "pillar", "confidence", "urgency_days"}
    for pk in data["pillar_order"]:
        for m in data["moves_by_pillar"][pk]["moves"]:
            missing = required - m.keys()
            assert not missing, f"Move missing fields: {missing}"
            assert m["pillar"] == pk
            assert m["confidence"] in {"high", "directional", "inconclusive"}


def test_v2_plan_moves_ranked_by_impact(client):
    data = client.get("/api/v2/plan").json()
    for pk in data["pillar_order"]:
        moves = data["moves_by_pillar"][pk]["moves"]
        impacts = [m.get("impact") or 0 for m in moves]
        assert impacts == sorted(impacts, reverse=True), \
            f"{pk} moves not ranked by impact"


def test_v2_plan_market_overlay_structure(client):
    overlay = client.get("/api/v2/plan").json()["market_overlay"]
    for f in ["applied", "net_impact", "signals_count", "signals"]:
        assert f in overlay
    if overlay["applied"]:
        assert overlay["signals_count"] == len(overlay["signals"])
        for sig in overlay["signals"]:
            assert "label" in sig
            assert "value_text" in sig
            assert sig["direction"] in {"up", "down", "flat"}


def test_v2_plan_channel_names_pretty_formatted(client):
    """Regression: channel names should be display-formatted, not snake_case."""
    data = client.get("/api/v2/plan").json()
    for pk in data["pillar_order"]:
        for m in data["moves_by_pillar"][pk]["moves"]:
            ch = m["channel"]
            # snake_case channels should have been title-cased
            assert "_" not in ch, f"Move channel '{ch}' still has snake_case underscore"
            # Lowercase single-words should have been capitalized
            if ch and ch[0].islower() and ch.isalpha():
                pytest.fail(f"Move channel '{ch}' is lowercase — _pretty() not applied")


def test_v2_plan_no_moves_when_no_data():
    """If no data loaded, endpoint 400s gracefully."""
    import api
    snapshot = {
        "campaign_data": api._state.get("campaign_data"),
        "reporting_data": api._state.get("reporting_data"),
        "_analysis_done": api._state.get("_analysis_done"),
        "optimization": api._state.get("optimization"),
    }
    try:
        c = TestClient(api.app)
        api._state["campaign_data"] = None
        api._state["reporting_data"] = None
        api._state["_analysis_done"] = False
        r = c.get("/api/v2/plan")
        assert r.status_code == 400
    finally:
        api._state["campaign_data"] = snapshot["campaign_data"]
        api._state["reporting_data"] = snapshot["reporting_data"]
        api._state["_analysis_done"] = snapshot["_analysis_done"]
        api._state["optimization"] = snapshot["optimization"]


def test_v2_plan_total_moves_matches_hero(client):
    """Sum of moves across pillars should equal hero.moves_count."""
    data = client.get("/api/v2/plan").json()
    total = sum(
        data["moves_by_pillar"][pk]["count"]
        for pk in data["pillar_order"]
    )
    assert total == data["hero"]["moves_count"]


def test_v2_plan_legacy_endpoint_unaffected(client):
    """Regression: legacy /api/plan must still respond 200."""
    r = client.get("/api/plan")
    assert r.status_code == 200
