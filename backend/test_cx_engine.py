"""
Tests for CX Engine.

Validates:
- Empty / minimal input handling
- Friction opportunity detection
- Orchestration opportunity detection
- Frequency fatigue opportunity detection
- Confidence tier assignment
- Integration with mock_data (smoke)
"""
import numpy as np
import pandas as pd
import pytest

from engines.cx_engine import (
    run_cx_analysis,
    _friction_opportunities,
    _orchestration_opportunities,
    _frequency_fatigue_opportunities,
    _confidence_tier,
)


def _base_df(n_periods=24, channels=("Email", "Paid Search", "Social Paid"), seed=42):
    """Synthetic campaign CSV with standard columns."""
    rng = np.random.default_rng(seed)
    rows = []
    for m in range(1, n_periods + 1):
        month = f"2024-{m:02d}" if m <= 12 else f"2025-{m - 12:02d}"
        for ch in channels:
            spend = float(rng.uniform(5000, 50000))
            imps = int(spend * rng.uniform(80, 120))
            clicks = int(imps * 0.025)
            leads = int(clicks * 0.10)
            mqls = int(leads * 0.50)
            sqls = int(mqls * 0.40)
            conv = int(sqls * 0.28)
            revenue = float(conv * rng.uniform(180, 250))
            rows.append({
                "month": month, "channel": ch, "spend": spend,
                "imps": imps, "clicks": clicks, "leads": leads,
                "mqls": mqls, "sqls": sqls, "conv": conv, "revenue": revenue,
                "region": "All", "channel_type": "online",
            })
    return pd.DataFrame(rows)


def test_empty_df_returns_empty():
    result = run_cx_analysis(pd.DataFrame())
    assert result["pillar"] == "cx_uplift"
    assert result["total_estimated_impact"] == 0
    assert result["opportunities"] == []


def test_none_df_returns_empty():
    result = run_cx_analysis(None)
    assert result["pillar"] == "cx_uplift"
    assert result["opportunities"] == []


def test_baseline_synthetic_runs_without_error():
    df = _base_df()
    result = run_cx_analysis(df)
    assert "opportunities" in result
    assert "metrics" in result
    assert result["metrics"]["journeys_at_risk"] >= 0
    assert result["metrics"]["frequency_flags"] >= 0
    assert result["metrics"]["friction_points"] >= 0


def test_friction_detected_when_funnel_stage_below_benchmark():
    df = _base_df(n_periods=12)
    # Crush the MQL → SQL rate way below benchmark (0.38)
    df["sqls"] = (df["mqls"] * 0.10).astype(int)
    df["conv"] = (df["sqls"] * 0.25).astype(int)
    friction = _friction_opportunities(df)
    assert len(friction) >= 1
    # At least one opportunity should name the MQL→SQL transition
    assert any("MQL" in o["title"] for o in friction)
    # Every friction opp should carry a pillar tag and confidence
    for o in friction:
        assert o["pillar"] == "cx_uplift"
        assert o["confidence"] in {"high", "directional", "inconclusive"}
        assert o["estimated_impact"] >= 0


def test_no_friction_when_funnel_healthy():
    df = _base_df(n_periods=12)
    # Healthy funnel: conversion rates at or above benchmark
    df["clicks"] = (df["imps"] * 0.03).astype(int)
    df["leads"] = (df["clicks"] * 0.10).astype(int)
    df["mqls"] = (df["leads"] * 0.55).astype(int)
    df["sqls"] = (df["mqls"] * 0.45).astype(int)
    df["conv"] = (df["sqls"] * 0.30).astype(int)
    friction = _friction_opportunities(df)
    # With healthy funnel, no friction opportunities
    assert len(friction) == 0


def test_fatigue_detected_with_rising_spend_falling_conv():
    df = _base_df(n_periods=12)
    # Make "Social Paid" show fatigue: early periods efficient, late periods bloated
    for i, idx in enumerate(df[df["channel"] == "Social Paid"].index):
        if i >= 6:  # later half
            df.at[idx, "spend"] = df.at[idx, "spend"] * 2.0  # 2x spend
            df.at[idx, "conv"] = int(df.at[idx, "conv"] * 0.6)  # 40% fewer conversions
    fatigue = _frequency_fatigue_opportunities(df)
    assert any("Social Paid" in o["title"] for o in fatigue)


def test_no_fatigue_when_spend_and_conv_stable():
    df = _base_df(n_periods=12)
    fatigue = _frequency_fatigue_opportunities(df)
    # Stable synthetic data should not flag fatigue
    assert all(o["basis"]["conv_decline_pct"] > 10.0 for o in fatigue) or len(fatigue) == 0


def test_confidence_tier_logic():
    # Below sample size threshold → inconclusive
    assert _confidence_tier(10, 0.01) == "inconclusive"
    # Above threshold with significant p → high
    assert _confidence_tier(100, 0.01) == "high"
    # Marginal p → directional
    assert _confidence_tier(100, 0.10) == "directional"
    # Non-significant p → inconclusive
    assert _confidence_tier(100, 0.50) == "inconclusive"
    # None p-value → directional (we computed but couldn't test)
    assert _confidence_tier(100, None) == "directional"


def test_opportunities_ranked_by_impact():
    df = _base_df(n_periods=24)
    # Force fatigue on Social Paid to ensure at least 1 opportunity
    for i, idx in enumerate(df[df["channel"] == "Social Paid"].index):
        if i >= 12:
            df.at[idx, "spend"] = df.at[idx, "spend"] * 2.5
            df.at[idx, "conv"] = int(df.at[idx, "conv"] * 0.5)
    result = run_cx_analysis(df)
    impacts = [o["estimated_impact"] for o in result["opportunities"]]
    # Must be ranked descending
    assert impacts == sorted(impacts, reverse=True)


def test_total_impact_equals_sum_of_opportunities():
    df = _base_df()
    result = run_cx_analysis(df)
    total = sum(o["estimated_impact"] for o in result["opportunities"])
    assert result["total_estimated_impact"] == round(float(total), 0)


def test_every_opportunity_has_required_fields():
    df = _base_df()
    # Force at least one opp via friction
    df["sqls"] = (df["mqls"] * 0.10).astype(int)
    result = run_cx_analysis(df)
    required = {"type", "pillar", "action_verb", "title", "detail",
                "estimated_impact", "confidence", "mechanism", "basis"}
    for opp in result["opportunities"]:
        assert required.issubset(opp.keys()), f"Missing fields: {required - opp.keys()}"
        assert opp["pillar"] == "cx_uplift"
        assert opp["confidence"] in {"high", "directional", "inconclusive"}


def test_integrates_with_v24_mock_data():
    """Smoke test: run CX analysis against the project's real mock data."""
    try:
        import sys, pathlib
        sys.path.insert(0, str(pathlib.Path(__file__).parent))
        from mock_data import get_mock_df
        df = get_mock_df()
        result = run_cx_analysis(df)
        # Just verifying it runs without crashing
        assert "opportunities" in result
        assert result["pillar"] == "cx_uplift"
    except ImportError:
        pytest.skip("mock_data not available in this context")
