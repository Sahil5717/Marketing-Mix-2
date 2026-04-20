"""
Tests for Pillar Aggregator.
"""
import pytest

from engines.pillar_aggregator import (
    aggregate_all_pillars,
    build_revenue_pillar,
    build_cost_pillar,
    build_cx_pillar,
    _classify_confidence_from_pct_gap,
)


def _fake_optimizer_result():
    return {
        "channels": [
            {"channel": "Email", "current_spend": 800_000, "optimized_spend": 3_200_000,
             "change_pct": 300, "revenue_uplift": 3_800_000, "marginal_roas": 5.2},
            {"channel": "Social Paid", "current_spend": 4_700_000, "optimized_spend": 6_200_000,
             "change_pct": 32, "revenue_uplift": 2_600_000, "marginal_roas": 3.1},
            {"channel": "Paid Search", "current_spend": 5_400_000, "optimized_spend": 4_400_000,
             "change_pct": -18, "cost_saving": 1_400_000, "past_saturation": True},
            {"channel": "Display", "current_spend": 2_800_000, "optimized_spend": 2_000_000,
             "change_pct": -28, "cost_saving": 900_000, "past_saturation": True},
            {"channel": "TV", "current_spend": 3_400_000, "optimized_spend": 3_400_000,
             "change_pct": 0},  # hold steady - won't be in either pillar
        ]
    }


def _fake_cx_result():
    return {
        "pillar": "cx_uplift",
        "total_estimated_impact": 1_800_000,
        "metrics": {"journeys_at_risk": 2, "frequency_flags": 1, "friction_points": 1},
        "opportunities": [
            {"type": "orchestration_gap", "action_verb": "Orchestrate",
             "title": "Orchestrate TV into multi-channel journeys",
             "detail": "TV converts 4.2× better when co-occurring with Email/Search.",
             "estimated_impact": 900_000, "confidence": "directional"},
            {"type": "frequency_fatigue", "action_verb": "Cap Frequency",
             "title": "Cap Paid Social frequency — fatigue detected",
             "detail": "Spend grew 40% while conversion rate fell 15%.",
             "estimated_impact": 500_000, "confidence": "directional"},
            {"type": "funnel_friction", "action_verb": "Fix Friction",
             "title": "Fix MQLs → SQLs drop-off",
             "detail": "Rate 18% below benchmark.",
             "estimated_impact": 400_000, "confidence": "inconclusive"},
        ],
    }


def test_confidence_classification():
    assert _classify_confidence_from_pct_gap(30) == "high"
    assert _classify_confidence_from_pct_gap(-30) == "high"
    assert _classify_confidence_from_pct_gap(15) == "directional"
    assert _classify_confidence_from_pct_gap(7) == "inconclusive"


def test_revenue_pillar_structure():
    pillar = build_revenue_pillar(_fake_optimizer_result())
    assert pillar["pillar"] == "revenue_uplift"
    # Email + Social Paid should appear, TV (0% change) should not
    channels_in_opps = [o["channel"] for o in pillar["opportunities"]]
    assert "Email" in channels_in_opps
    assert "Social Paid" in channels_in_opps
    assert "TV" not in channels_in_opps
    assert pillar["headline_value"] == 3_800_000 + 2_600_000


def test_cost_pillar_structure():
    pillar = build_cost_pillar(_fake_optimizer_result())
    assert pillar["pillar"] == "cost_reduction"
    channels_in_opps = [o["channel"] for o in pillar["opportunities"]]
    assert "Paid Search" in channels_in_opps
    assert "Display" in channels_in_opps
    assert pillar["headline_value"] == 1_400_000 + 900_000


def test_cx_pillar_structure():
    pillar = build_cx_pillar(_fake_cx_result())
    assert pillar["pillar"] == "cx_uplift"
    assert pillar["headline_value"] == 1_800_000
    assert pillar["opportunity_count"] == 3
    assert pillar["metrics"]["primary_label"] == "Journeys at risk"
    assert pillar["metrics"]["primary_value"] == "2"


def test_aggregate_all_pillars_structure():
    result = aggregate_all_pillars(_fake_optimizer_result(), _fake_cx_result())
    assert "hero" in result
    assert "pillars" in result
    assert result["pillar_order"] == ["revenue_uplift", "cost_reduction", "cx_uplift"]
    # Total recoverable = Revenue + Cost + CX = 6.4M + 2.3M + 1.8M = 10.5M
    assert result["hero"]["total_recoverable"] == 6_400_000 + 2_300_000 + 1_800_000
    assert result["hero"]["opportunity_count"] > 0


def test_opportunities_ranked_by_impact_in_each_pillar():
    result = aggregate_all_pillars(_fake_optimizer_result(), _fake_cx_result())
    for pillar_key, pillar in result["pillars"].items():
        impacts = [o["estimated_impact"] for o in pillar["opportunities"]]
        assert impacts == sorted(impacts, reverse=True), f"{pillar_key} not sorted"


def test_revenue_pillar_action_verbs():
    pillar = build_revenue_pillar(_fake_optimizer_result())
    # Email has small current spend → should be "Scale"
    email_opp = next((o for o in pillar["opportunities"] if o["channel"] == "Email"), None)
    assert email_opp is not None
    assert email_opp["action_verb"] == "Scale"
    # Social Paid has larger spend → should be "Shift"
    social_opp = next((o for o in pillar["opportunities"] if o["channel"] == "Social Paid"), None)
    assert social_opp is not None
    assert social_opp["action_verb"] == "Shift"


def test_cost_pillar_cut_spend_verb():
    pillar = build_cost_pillar(_fake_optimizer_result())
    for opp in pillar["opportunities"]:
        assert opp["action_verb"] in {"Cut Spend", "Renegotiate", "Reduce Freq"}


def test_market_adjustments_adds_renegotiate_opp():
    mkt_adj = {
        "cost_trends": [
            {"channel": "Display", "metric": "CPM", "direction": "down",
             "yoy_change_pct": -13, "opportunity_value": 900_000,
             "explanation": "Market CPM softened 13% YoY."},
            {"channel": "Paid Search", "metric": "CPC", "direction": "up",
             "yoy_change_pct": 22, "opportunity_value": 0,
             "explanation": "CPC inflation."},
        ]
    }
    pillar = build_cost_pillar(_fake_optimizer_result(), market_adjustments=mkt_adj)
    # Should pick up the Display renegotiation trend
    reneg_opp = next((o for o in pillar["opportunities"] if o["action_verb"] == "Renegotiate"), None)
    assert reneg_opp is not None
    # And the CPC YoY should appear in the secondary metric
    assert pillar["metrics"]["secondary_value"] == "+22% YoY"


def test_empty_inputs_return_empty_pillars():
    result = aggregate_all_pillars({}, {})
    assert result["hero"]["total_recoverable"] == 0
    assert result["hero"]["opportunity_count"] == 0
    for pillar_key in ["revenue_uplift", "cost_reduction", "cx_uplift"]:
        assert result["pillars"][pillar_key]["headline_value"] == 0
        assert result["pillars"][pillar_key]["opportunity_count"] == 0


def test_pillar_captions_present():
    result = aggregate_all_pillars(_fake_optimizer_result(), _fake_cx_result())
    for pillar_key in ["revenue_uplift", "cost_reduction", "cx_uplift"]:
        caption = result["pillars"][pillar_key]["caption"]
        assert len(caption) > 20  # non-empty meaningful caption
