"""
Smoke tests for /api/v2/channel/{channel} endpoint.
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


def test_v2_channel_returns_200_for_known_channel(client):
    # Mock data channels are snake_case
    r = client.get("/api/v2/channel/paid_search")
    assert r.status_code == 200


def test_v2_channel_handles_unknown_channel(client):
    r = client.get("/api/v2/channel/nonexistent_channel")
    assert r.status_code == 404


def test_v2_channel_accepts_pretty_name(client):
    """Endpoint should accept 'Paid Search' as well as 'paid_search'."""
    r = client.get("/api/v2/channel/Paid Search")
    assert r.status_code == 200


def test_v2_channel_hero_shape(client):
    r = client.get("/api/v2/channel/paid_search")
    data = r.json()
    hero = data["hero"]
    assert hero["channel"] == "Paid Search"
    assert hero["channel_raw"] == "paid_search"
    assert isinstance(hero["share_of_spend_pct"], (int, float))
    assert hero["share_of_spend_pct"] > 0
    assert isinstance(hero["pillars_hit"], list)
    for p in hero["pillars_hit"]:
        assert p in {"revenue_uplift", "cost_reduction", "cx_uplift"}


def test_v2_channel_kpis_all_five_present(client):
    data = client.get("/api/v2/channel/paid_search").json()
    kpi_labels = [k["label"] for k in data["kpis"]]
    assert kpi_labels == ["Revenue impact", "Cost saving", "CX effect", "Current ROAS", "CPC trend"]


def test_v2_channel_response_curve_has_points(client):
    data = client.get("/api/v2/channel/paid_search").json()
    rc = data["response_curve"]
    assert rc is not None
    assert len(rc["points"]) > 10
    # Points should be monotonically increasing in spend
    for i in range(1, len(rc["points"])):
        assert rc["points"][i]["spend"] >= rc["points"][i - 1]["spend"]
    # HDI bounds sensible
    for p in rc["points"]:
        assert p["revenue_low"] <= p["revenue"] <= p["revenue_high"]


def test_v2_channel_vitals_shape(client):
    data = client.get("/api/v2/channel/paid_search").json()
    vitals = data["vitals"]
    for key in ["spend", "share_of_spend_pct", "roas", "confidence", "model_r2", "weeks_of_data"]:
        assert key in vitals
    assert vitals["confidence"] in {"High", "Directional", "Inconclusive"}


def test_v2_channel_recommendations_have_shape(client):
    data = client.get("/api/v2/channel/paid_search").json()
    recs = data["recommendations"]
    required = {"pillar", "action_verb", "title", "detail", "impact", "confidence"}
    for rec in recs:
        assert required.issubset(rec.keys())
        assert rec["pillar"] in {"revenue_uplift", "cost_reduction", "cx_uplift"}


def test_v2_channel_cpc_trend_from_market_adjustments(client):
    """Paid Search should show CPC +22% YoY in market adjustments."""
    data = client.get("/api/v2/channel/paid_search").json()
    cpc_kpi = [k for k in data["kpis"] if k["label"] == "CPC trend"][0]
    assert cpc_kpi["value"] > 0  # paid_search has +22% YoY in mock data


def test_v2_channel_share_of_spend_across_channels_sums_roughly_100(client):
    """All channels' share_of_spend_pct should sum to ~100%."""
    from engines.pillar_aggregator import _pretty  # noqa
    channels = ["paid_search", "social_paid", "display", "tv_national", "email",
                "direct_mail", "events", "call_center", "organic_search",
                "video_youtube", "radio", "ooh"]
    total_share = 0
    for ch in channels:
        r = client.get(f"/api/v2/channel/{ch}")
        if r.status_code == 200:
            total_share += r.json()["hero"]["share_of_spend_pct"]
    assert 95 < total_share < 105  # within rounding tolerance


def test_v2_channel_reviewer_shape(client):
    data = client.get("/api/v2/channel/paid_search").json()
    rev = data["reviewer"]
    for key in ["name", "role", "weeks_of_data", "model_r2"]:
        assert key in rev


def test_v2_channel_requires_analysis():
    """Endpoint should 400 if analysis hasn't run."""
    import api
    snapshot = {k: api._state.get(k) for k in
                ["campaign_data", "reporting_data", "_analysis_done", "curves", "optimization"]}
    try:
        c = TestClient(api.app)
        api._state["campaign_data"] = None
        api._state["_analysis_done"] = False
        r = c.get("/api/v2/channel/paid_search")
        assert r.status_code == 400
    finally:
        for k, v in snapshot.items():
            api._state[k] = v
