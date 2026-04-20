"""
Smoke tests for /api/v2/diagnosis endpoint.

These exercise the full pipeline: load mock data → run analysis → v2/diagnosis.
They verify the endpoint returns the mockup-shaped payload and doesn't regress.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    import api
    c = TestClient(api.app)
    # Load mock data + run analysis once per module
    r = c.post("/api/load-mock-data")
    assert r.status_code == 200, f"load-mock-data failed: {r.text}"
    r = c.post("/api/run-analysis")
    assert r.status_code == 200, f"run-analysis failed: {r.text}"
    return c


def test_v2_diagnosis_returns_200(client):
    r = client.get("/api/v2/diagnosis")
    assert r.status_code == 200


def test_v2_diagnosis_has_all_top_level_keys(client):
    r = client.get("/api/v2/diagnosis")
    data = r.json()
    for key in ["hero", "kpis", "pillars", "pillar_order",
                "market_context_summary", "reviewer"]:
        assert key in data, f"Missing top-level key: {key}"


def test_v2_diagnosis_hero_shape(client):
    data = client.get("/api/v2/diagnosis").json()
    hero = data["hero"]
    assert "total_recoverable" in hero
    assert "pillar_count" in hero
    assert hero["pillar_count"] == 3
    assert "opportunity_count" in hero
    assert "portfolio_roas" in hero
    # Sanity: total recoverable should be a positive number
    assert hero["total_recoverable"] > 0


def test_v2_diagnosis_kpis_shape(client):
    data = client.get("/api/v2/diagnosis").json()
    kpis = data["kpis"]
    for key in ["marketing_roi", "portfolio_roas", "mer", "mkt_driven_revenue_pct"]:
        assert key in kpis
        tile = kpis[key]
        assert "value" in tile
        assert "delta_direction" in tile
        assert "unit" in tile
        assert tile["delta_direction"] in {"up", "down", "flat"}
    # LTV:CAC has distinct shape - should be N/A for v24 mock data (no customer data)
    assert kpis["ltv_cac"]["available"] is False
    assert kpis["ltv_cac"]["value"] is None
    assert "cta" in kpis["ltv_cac"]


def test_v2_diagnosis_pillars_shape(client):
    data = client.get("/api/v2/diagnosis").json()
    assert data["pillar_order"] == ["revenue_uplift", "cost_reduction", "cx_uplift"]
    for pk in data["pillar_order"]:
        p = data["pillars"][pk]
        for field in ["pillar", "headline_value", "opportunity_count",
                      "caption", "metrics", "opportunities"]:
            assert field in p, f"Pillar {pk} missing field: {field}"
        # Metrics tile shape
        assert "primary_label" in p["metrics"]
        assert "primary_value" in p["metrics"]
        assert "secondary_label" in p["metrics"]
        assert "secondary_value" in p["metrics"]


def test_v2_diagnosis_opportunities_ranked(client):
    """Every pillar's opportunities must be sorted by impact descending."""
    data = client.get("/api/v2/diagnosis").json()
    for pk in data["pillar_order"]:
        opps = data["pillars"][pk]["opportunities"]
        impacts = [o["estimated_impact"] for o in opps]
        assert impacts == sorted(impacts, reverse=True), \
            f"Pillar {pk} opportunities not sorted by impact"


def test_v2_diagnosis_opportunities_have_all_fields(client):
    """Every opportunity must have the fields the UI renders."""
    data = client.get("/api/v2/diagnosis").json()
    required = {"channel", "title", "detail", "estimated_impact",
                "action_verb", "confidence", "urgency_days"}
    for pk in data["pillar_order"]:
        for opp in data["pillars"][pk]["opportunities"]:
            missing = required - opp.keys()
            assert not missing, f"{pk} opp missing fields: {missing}"
            assert opp["confidence"] in {"high", "directional", "inconclusive"}


def test_v2_diagnosis_hero_opportunity_count_matches_pillar_totals(client):
    """The hero opportunity count must equal sum of per-pillar counts."""
    data = client.get("/api/v2/diagnosis").json()
    hero_count = data["hero"]["opportunity_count"]
    pillar_sum = sum(data["pillars"][pk]["opportunity_count"] for pk in data["pillar_order"])
    assert hero_count == pillar_sum


def test_v2_diagnosis_reviewer_shape(client):
    data = client.get("/api/v2/diagnosis").json()
    rev = data["reviewer"]
    for key in ["name", "role", "channels", "campaigns"]:
        assert key in rev
    # v24 mock data has 12 channels, 34 campaigns
    assert rev["channels"] == 12
    assert rev["campaigns"] == 34


def test_v2_diagnosis_requires_data_loaded():
    """If no data loaded, endpoint should 400 gracefully."""
    import api
    # Snapshot state so we can restore (this test mutates shared _state)
    snapshot = {
        "campaign_data": api._state.get("campaign_data"),
        "reporting_data": api._state.get("reporting_data"),
        "_analysis_done": api._state.get("_analysis_done"),
    }
    try:
        c = TestClient(api.app)
        api._state["campaign_data"] = None
        api._state["reporting_data"] = None
        api._state["_analysis_done"] = False
        r = c.get("/api/v2/diagnosis")
        assert r.status_code == 400
        assert "No data" in r.json().get("detail", "")
    finally:
        # Restore state so downstream tests still work
        api._state["campaign_data"] = snapshot["campaign_data"]
        api._state["reporting_data"] = snapshot["reporting_data"]
        api._state["_analysis_done"] = snapshot["_analysis_done"]


def test_v1_diagnosis_still_works_after_v2_added(client):
    """Regression: existing /api/diagnosis must remain functional."""
    r = client.get("/api/diagnosis")
    assert r.status_code == 200
    # v1 shape check - should still have its historical keys
    data = r.json()
    # v1 has "findings" and "kpis" at minimum
    assert "findings" in data or "kpis" in data, \
        "v1 /api/diagnosis looks broken after v2 addition"


def test_v2_market_context_has_upcoming_events(client):
    """Market tile should surface upcoming events from events_result."""
    data = client.get("/api/v2/diagnosis").json()
    mc = data["market_context_summary"]
    assert mc["events_count"] >= 1, "Expected at least one upcoming event in mock data"
    for ev in mc["upcoming_events"]:
        for field in ["name", "when", "impact_pct", "direction"]:
            assert field in ev, f"Event missing field: {field}"
        assert ev["direction"] in {"up", "down"}


def test_v2_market_context_has_cost_alerts(client):
    """Market tile should surface cost alerts from trends_result."""
    data = client.get("/api/v2/diagnosis").json()
    mc = data["market_context_summary"]
    # Mock data has paid_search CPC +22% YoY — should surface
    assert mc["cost_alerts_count"] >= 1
    assert mc["top_alert"] is not None
    assert "title" in mc["top_alert"]
    assert "body" in mc["top_alert"]


def test_v2_market_context_events_ranked_by_proximity(client):
    """The event closest in time should appear first."""
    data = client.get("/api/v2/diagnosis").json()
    events = data["market_context_summary"]["upcoming_events"]
    if len(events) >= 2:
        # Can't directly compare string "when" values, but the ordering logic
        # should put nearer events first. Parse "In N days"/"In N month(s)" roughly.
        def _rank(when: str) -> int:
            if "day" in when:
                return int(when.split()[1]) if when.split()[1].isdigit() else 9999
            if "month" in when:
                months = int(when.split()[1]) if when.split()[1].isdigit() else 999
                return months * 30
            return 9999
        ranks = [_rank(e["when"]) for e in events]
        assert ranks == sorted(ranks), "Events not ordered by proximity"
