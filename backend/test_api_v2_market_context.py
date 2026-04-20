"""
Smoke tests for /api/v2/market-context endpoint.
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


def test_v2_market_context_returns_200(client):
    r = client.get("/api/v2/market-context")
    assert r.status_code == 200


def test_v2_market_context_hero_shape(client):
    data = client.get("/api/v2/market-context").json()
    hero = data["hero"]
    for key in ["signals_count", "net_market_effect", "period_label",
                "pillars_affected", "events_count", "cost_alerts_count",
                "competitive_count"]:
        assert key in hero


def test_v2_market_context_has_five_kpis(client):
    data = client.get("/api/v2/market-context").json()
    assert len(data["kpis"]) == 5
    labels = [k["label"] for k in data["kpis"]]
    assert "Events loaded" in labels
    assert "Cost trends" in labels
    assert "Competitive" in labels
    assert "Net market effect" in labels
    assert "Data freshness" in labels


def test_v2_market_context_events_have_pillar_tags(client):
    data = client.get("/api/v2/market-context").json()
    events = data["events"]
    assert len(events) > 0
    for ev in events:
        required = {"name", "when_label", "days_away", "impact_pct",
                    "direction", "pillars_affected"}
        assert required.issubset(ev.keys())
        assert isinstance(ev["pillars_affected"], list)
        for p in ev["pillars_affected"]:
            assert p in {"revenue_uplift", "cost_reduction", "cx_uplift"}


def test_v2_market_context_events_sorted_by_proximity(client):
    data = client.get("/api/v2/market-context").json()
    events = data["events"]
    for i in range(1, len(events)):
        assert events[i]["days_away"] >= events[i - 1]["days_away"]


def test_v2_market_context_diwali_classified_as_revenue(client):
    """Diwali is a positive-impact event, should be tagged revenue_uplift."""
    data = client.get("/api/v2/market-context").json()
    diwali = next(
        (e for e in data["events"] if "diwali" in e["name"].lower()),
        None
    )
    if diwali:
        assert "revenue_uplift" in diwali["pillars_affected"]
        assert diwali["direction"] == "up"


def test_v2_market_context_competitor_event_tagged_cx(client):
    """Negative competitor events should be tagged cx_uplift (brand pressure)."""
    data = client.get("/api/v2/market-context").json()
    comp_event = next(
        (e for e in data["events"] if "competitor" in e["name"].lower()),
        None
    )
    if comp_event and comp_event["impact_pct"] < 0:
        assert "cx_uplift" in comp_event["pillars_affected"]


def test_v2_market_context_cost_alerts_sorted_by_magnitude(client):
    data = client.get("/api/v2/market-context").json()
    alerts = data["cost_alerts"]
    for i in range(1, len(alerts)):
        assert abs(alerts[i]["yoy_change_pct"]) <= abs(alerts[i - 1]["yoy_change_pct"])


def test_v2_market_context_cost_alerts_have_pillar_link(client):
    data = client.get("/api/v2/market-context").json()
    for alert in data["cost_alerts"]:
        # pillar_link can be None if change is stable
        if alert["pillar_link"] is not None:
            assert alert["pillar_link"] in {"revenue_uplift", "cost_reduction", "cx_uplift"}


def test_v2_market_context_paid_search_cpc_up(client):
    """Paid Search should have the +22% YoY CPC alert we know is in mock data."""
    data = client.get("/api/v2/market-context").json()
    ps = next(
        (a for a in data["cost_alerts"] if a["channel"] == "Paid Search"),
        None
    )
    assert ps is not None
    assert ps["yoy_change_pct"] > 0
    assert ps["direction"] == "up"


def test_v2_market_context_competitive_sorted_by_pressure(client):
    """Lowest-SOV channels come first (most pressured)."""
    data = client.get("/api/v2/market-context").json()
    comp = data["competitive"]
    for i in range(1, len(comp)):
        assert comp[i]["share_of_voice_pct"] >= comp[i - 1]["share_of_voice_pct"]


def test_v2_market_context_net_effect_sign_reflects_reality(client):
    """
    Rising CPCs (Paid Search +22%) should produce a negative net_market_effect.
    """
    data = client.get("/api/v2/market-context").json()
    # In the mock data, the dominant trends are CPC rises → net effect should be negative
    assert data["hero"]["net_market_effect"] < 0


def test_v2_market_context_upload_cta_hidden_when_all_loaded(client):
    """All 3 data sources are loaded in mock data — CTA should be hidden."""
    data = client.get("/api/v2/market-context").json()
    assert set(data["data_sources_loaded"]) == {"events", "trends", "competitive"}
    assert data["upload_cta_visible"] is False


def test_v2_market_context_reviewer_shape(client):
    data = client.get("/api/v2/market-context").json()
    rev = data["reviewer"]
    for key in ["name", "role", "signals_summary"]:
        assert key in rev
