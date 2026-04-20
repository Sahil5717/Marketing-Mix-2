"""
Tests for Portfolio KPI Engine.
"""
import pandas as pd
import pytest

from engines.portfolio_kpis import (
    compute_portfolio_kpis,
    _compute_single_period_kpis,
    _split_current_vs_prior,
    _safe_div,
)


def _make_df(months=("2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"),
             spend=1e6, revenue=3e6):
    rows = []
    for m in months:
        rows.append({"month": m, "channel": "Email", "spend": spend, "revenue": revenue})
    return pd.DataFrame(rows)


def test_safe_div_zero_denominator():
    assert _safe_div(100, 0) == 0.0
    assert _safe_div(0, 100) == 0.0
    assert _safe_div(100, 100) == 1.0


def test_empty_df_returns_zero_kpis():
    result = compute_portfolio_kpis(pd.DataFrame())
    assert result["portfolio_roas"]["value"] == 0
    assert result["marketing_roi"]["value"] == 0
    assert result["mer"]["value"] == 0


def test_ltv_cac_defaults_na():
    result = compute_portfolio_kpis(_make_df())
    assert result["ltv_cac"]["available"] is False
    assert result["ltv_cac"]["value"] is None
    assert "Upload" in result["ltv_cac"]["cta"]


def test_ltv_cac_available_when_provided():
    result = compute_portfolio_kpis(_make_df(), customer_data_available=True, ltv_cac=3.2)
    assert result["ltv_cac"]["available"] is True
    assert result["ltv_cac"]["value"] == 3.2


def test_roas_computation():
    # Spend $1M, revenue $3M → ROAS 3.0×
    kpis = _compute_single_period_kpis(_make_df(spend=1e6, revenue=3e6))
    assert kpis["portfolio_roas"] == 3.0


def test_mer_uses_total_business_revenue():
    # Single-row df: spend $1M, revenue $3M. Total business revenue $10M → MER = 10×
    df = pd.DataFrame([{"month": "2026-01", "channel": "Email", "spend": 1e6, "revenue": 3e6}])
    kpis = _compute_single_period_kpis(df, total_business_revenue=10e6)
    assert kpis["mer"] == 10.0


def test_mkt_driven_pct_computation():
    # $3M attributable / $10M total = 30%
    df = pd.DataFrame([{"month": "2026-01", "channel": "Email", "spend": 1e6, "revenue": 3e6}])
    kpis = _compute_single_period_kpis(df, total_business_revenue=10e6)
    assert kpis["mkt_driven_revenue_pct"] == 30.0


def test_delta_direction_up_when_roas_improves():
    rows = []
    # Prior quarter (Q4 2025) - ROAS 2.0×
    for m in ("2025-10", "2025-11", "2025-12"):
        rows.append({"month": m, "channel": "Email", "spend": 1e6, "revenue": 2e6})
    # Current quarter (Q1 2026) - ROAS 3.0×
    for m in ("2026-01", "2026-02", "2026-03"):
        rows.append({"month": m, "channel": "Email", "spend": 1e6, "revenue": 3e6})
    df = pd.DataFrame(rows)
    result = compute_portfolio_kpis(df)
    assert result["portfolio_roas"]["delta"] == 1.0
    assert result["portfolio_roas"]["delta_direction"] == "up"


def test_delta_direction_down_when_roas_declines():
    rows = []
    for m in ("2025-10", "2025-11", "2025-12"):
        rows.append({"month": m, "channel": "Email", "spend": 1e6, "revenue": 3e6})
    for m in ("2026-01", "2026-02", "2026-03"):
        rows.append({"month": m, "channel": "Email", "spend": 1e6, "revenue": 2e6})
    df = pd.DataFrame(rows)
    result = compute_portfolio_kpis(df)
    assert result["portfolio_roas"]["delta"] == -1.0
    assert result["portfolio_roas"]["delta_direction"] == "down"


def test_delta_flat_when_no_change():
    rows = []
    for m in ("2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"):
        rows.append({"month": m, "channel": "Email", "spend": 1e6, "revenue": 3e6})
    df = pd.DataFrame(rows)
    result = compute_portfolio_kpis(df)
    assert result["portfolio_roas"]["delta_direction"] == "flat"


def test_split_current_vs_prior():
    df = _make_df()
    current, prior = _split_current_vs_prior(df)
    # With 6 months of data, we get 2 quarters — both 3 months each
    assert len(current) == 3
    assert len(prior) == 3


def test_marketing_roi_uses_gross_margin():
    # Spend $1M, revenue $3M, GM 65% → Marketing ROI = (3M × 0.65) / 1M = 1.95×
    kpis = _compute_single_period_kpis(_make_df(spend=1e6, revenue=3e6), gross_margin_pct=0.65)
    assert kpis["marketing_roi"] == 1.95


def test_integrates_with_v24_mock_data():
    """Smoke test against real mock data."""
    try:
        from mock_data import generate_all_data
        data = generate_all_data()
        df = data["campaign_performance"]
        # Rename v24's long-form columns the KPI engine expects
        result = compute_portfolio_kpis(df)
        # Sanity bounds
        assert result["portfolio_roas"]["value"] > 0
        assert result["mer"]["value"] > 0
        assert 0 < result["mkt_driven_revenue_pct"]["value"] < 100
    except ImportError:
        pytest.skip("mock_data not available")
