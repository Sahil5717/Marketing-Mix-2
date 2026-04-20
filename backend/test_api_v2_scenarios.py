"""
Smoke tests for /api/v2/scenarios endpoint.

These verify the three-scenario payload is shaped correctly and the
channel comparison table is complete.
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


def test_v2_scenarios_returns_200(client):
    r = client.get("/api/v2/scenarios")
    assert r.status_code == 200


def test_v2_scenarios_has_three_scenarios(client):
    data = client.get("/api/v2/scenarios").json()
    assert len(data["scenarios"]) == 3
    keys = [s["key"] for s in data["scenarios"]]
    assert keys == ["baseline", "recommended", "aggressive"]


def test_v2_scenarios_recommended_is_selected_by_default(client):
    data = client.get("/api/v2/scenarios").json()
    selected = [s for s in data["scenarios"] if s["selected"]]
    assert len(selected) == 1
    assert selected[0]["key"] == "recommended"


def test_v2_scenarios_baseline_has_zero_lift(client):
    data = client.get("/api/v2/scenarios").json()
    baseline = next(s for s in data["scenarios"] if s["key"] == "baseline")
    assert baseline["hero_value"] == 0.0
    assert baseline["hero_value_format"] == "zero"
    assert baseline["moves_count"] == 0


def test_v2_scenarios_recommended_has_positive_lift(client):
    data = client.get("/api/v2/scenarios").json()
    rec = next(s for s in data["scenarios"] if s["key"] == "recommended")
    assert rec["hero_value"] > 0
    assert rec["moves_count"] > 0
    assert rec["stats"]["confidence"] in {"high", "directional", "inconclusive"}


def test_v2_scenarios_aggressive_has_larger_budget(client):
    data = client.get("/api/v2/scenarios").json()
    baseline = next(s for s in data["scenarios"] if s["key"] == "baseline")
    aggressive = next(s for s in data["scenarios"] if s["key"] == "aggressive")
    assert aggressive["stats"]["total_spend"] > baseline["stats"]["total_spend"]


def test_v2_scenarios_channel_table_has_all_channels(client):
    data = client.get("/api/v2/scenarios").json()
    # Mock data has 12 channels
    assert len(data["channel_table"]["rows"]) == 12


def test_v2_scenarios_channel_rows_have_required_fields(client):
    data = client.get("/api/v2/scenarios").json()
    required = {"channel", "baseline", "recommended", "aggressive", "primary_pillar"}
    for row in data["channel_table"]["rows"]:
        assert required.issubset(row.keys())
        assert row["primary_pillar"] in {"revenue_uplift", "cost_reduction", "cx_uplift"}


def test_v2_scenarios_channel_totals_match_scenario_spend(client):
    data = client.get("/api/v2/scenarios").json()
    baseline_stat = next(s for s in data["scenarios"] if s["key"] == "baseline")["stats"]["total_spend"]
    baseline_total = data["channel_table"]["totals"]["baseline"]
    # Small tolerance for rounding
    assert abs(baseline_stat - baseline_total) < 1.0


def test_v2_scenarios_channels_prettified(client):
    """Channel names in the table should be Title Case, not snake_case."""
    data = client.get("/api/v2/scenarios").json()
    for row in data["channel_table"]["rows"]:
        assert "_" not in row["channel"], f"Channel not prettified: {row['channel']}"


def test_v2_scenarios_requires_run_analysis():
    """If run-analysis hasn't happened, endpoint should 400."""
    import api
    snapshot = {
        "campaign_data": api._state.get("campaign_data"),
        "reporting_data": api._state.get("reporting_data"),
        "_analysis_done": api._state.get("_analysis_done"),
        "optimization": api._state.get("optimization"),
        "curves": api._state.get("curves"),
    }
    try:
        c = TestClient(api.app)
        api._state["campaign_data"] = None
        api._state["optimization"] = None
        api._state["curves"] = None
        api._state["_analysis_done"] = False
        r = c.get("/api/v2/scenarios")
        assert r.status_code == 400
    finally:
        for k, v in snapshot.items():
            api._state[k] = v


def test_v2_scenarios_reviewer_shape(client):
    data = client.get("/api/v2/scenarios").json()
    rev = data["reviewer"]
    for key in ["name", "role", "channels_modeled", "hdi_pct"]:
        assert key in rev
    assert rev["hdi_pct"] == 90
    assert rev["channels_modeled"] == 12
