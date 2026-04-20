"""
Portfolio KPI Engine — Production Grade
=========================================
Computes portfolio-level KPIs shown on the Diagnosis screen:
  - Marketing ROI  (marketing-attributed profit per dollar spent)
  - Portfolio ROAS (revenue per dollar spent)
  - MER            (total revenue per dollar spent, including non-marketing)
  - Marketing-driven revenue % (attributable revenue / total revenue)
  - LTV:CAC        (requires customer data upload, returns N/A if missing)

These differ from the per-channel ROI variants in roi_formulas.py. Those are
channel-level with bootstrap CIs. These are single portfolio numbers.

Each KPI also returns a prior-quarter delta so the UI can show ▲ / ▼ indicators.

Libraries: numpy, pandas
"""
from typing import Dict, Optional
import numpy as np
import pandas as pd
import logging

logger = logging.getLogger(__name__)


def _safe_div(num: float, denom: float) -> float:
    """Divide with a zero-denominator guard."""
    return float(num) / float(denom) if denom and denom != 0 else 0.0


def _split_current_vs_prior(df: pd.DataFrame) -> tuple:
    """
    Split campaign data into current quarter vs prior quarter for delta calculation.

    If time data is present, take the last calendar quarter as "current" and the
    quarter before as "prior". Otherwise, split the data in half.
    """
    time_col = "month" if "month" in df.columns else ("date" if "date" in df.columns else None)
    if not time_col or len(df) == 0:
        return df, None

    try:
        # Parse the time column into datetime for reliable quarter bucketing
        dates = pd.to_datetime(df[time_col], errors="coerce")
        if dates.isna().all():
            # Fallback: split data in half
            mid = len(df) // 2
            return df.iloc[mid:], df.iloc[:mid]
        quarters = dates.dt.to_period("Q")
        unique_quarters = sorted(quarters.dropna().unique())
        if len(unique_quarters) < 2:
            return df, None
        current_q = unique_quarters[-1]
        prior_q = unique_quarters[-2]
        current = df[quarters == current_q]
        prior = df[quarters == prior_q]
        if len(current) == 0 or len(prior) == 0:
            return df, None
        return current, prior
    except Exception as e:
        logger.warning(f"Quarter split failed: {e}")
        return df, None


def _compute_single_period_kpis(
    df: pd.DataFrame,
    total_business_revenue: Optional[float] = None,
    gross_margin_pct: float = 0.65,
) -> Dict:
    """Compute the 4 always-available KPIs for a single slice of data."""
    if df is None or len(df) == 0:
        return {
            "marketing_roi": 0.0,
            "portfolio_roas": 0.0,
            "mer": 0.0,
            "mkt_driven_revenue_pct": 0.0,
        }

    spend = float(df["spend"].sum()) if "spend" in df.columns else 0.0
    attributable_revenue = float(df["revenue"].sum()) if "revenue" in df.columns else 0.0

    # If caller did not supply a total business revenue, assume attributable revenue ≈ 42% of total
    # (this is the v24 assumption until proper data integration). This is where the Marketing-driven %
    # defaults to ~42% in the absence of real non-marketing revenue data.
    if total_business_revenue is None or total_business_revenue <= 0:
        total_business_revenue = attributable_revenue / 0.42 if attributable_revenue > 0 else 0.0

    portfolio_roas = _safe_div(attributable_revenue, spend)
    mer = _safe_div(total_business_revenue, spend)
    mkt_driven_pct = _safe_div(attributable_revenue, total_business_revenue) * 100
    # Marketing ROI treats profit (not revenue) as the numerator
    marketing_profit = attributable_revenue * gross_margin_pct - spend
    marketing_roi = _safe_div(marketing_profit + spend, spend)  # (profit + spend) / spend == (GM*rev)/spend

    return {
        "marketing_roi": round(marketing_roi, 2),
        "portfolio_roas": round(portfolio_roas, 2),
        "mer": round(mer, 2),
        "mkt_driven_revenue_pct": round(mkt_driven_pct, 1),
    }


def compute_portfolio_kpis(
    df: pd.DataFrame,
    total_business_revenue: Optional[float] = None,
    gross_margin_pct: float = 0.65,
    customer_data_available: bool = False,
    ltv_cac: Optional[float] = None,
) -> Dict:
    """
    Main entry point for the Diagnosis KPI strip.

    Returns a dict shaped for the mockup:
    {
        "marketing_roi":   {"value": float, "delta": float, "delta_direction": "up"|"down"|"flat"},
        "portfolio_roas":  {...},
        "mer":             {...},
        "mkt_driven_revenue_pct": {...},
        "ltv_cac":         {"value": None|float, "available": bool, "cta": "Upload customer data"},
    }

    `delta` is the absolute change (e.g. +0.3× or -0.2×), `delta_direction` is a string
    the UI can key off for coloring.
    """
    current_df, prior_df = _split_current_vs_prior(df)

    current_kpis = _compute_single_period_kpis(
        current_df, total_business_revenue, gross_margin_pct
    )

    if prior_df is not None and len(prior_df) > 0:
        prior_kpis = _compute_single_period_kpis(
            prior_df, total_business_revenue, gross_margin_pct
        )
    else:
        prior_kpis = None

    def _tile(key: str, unit: str = "×") -> Dict:
        value = current_kpis[key]
        if prior_kpis is not None:
            prior_value = prior_kpis[key]
            delta = round(value - prior_value, 2)
            if abs(delta) < 0.05:
                direction = "flat"
            elif delta > 0:
                direction = "up"
            else:
                direction = "down"
        else:
            delta = None
            direction = "flat"
        return {"value": value, "delta": delta, "delta_direction": direction, "unit": unit}

    result = {
        "marketing_roi": _tile("marketing_roi", "×"),
        "portfolio_roas": _tile("portfolio_roas", "×"),
        "mer": _tile("mer", "×"),
        "mkt_driven_revenue_pct": _tile("mkt_driven_revenue_pct", "%"),
    }

    # LTV:CAC requires customer data — intentionally N/A until uploaded
    if customer_data_available and ltv_cac is not None:
        result["ltv_cac"] = {
            "value": round(float(ltv_cac), 2),
            "available": True,
            "cta": None,
        }
    else:
        result["ltv_cac"] = {
            "value": None,
            "available": False,
            "cta": "Upload customer data",
        }

    return result
