"""
CX Engine — Production Grade
================================
Journey-based Customer Experience opportunities derived from existing campaign data.

Does NOT require customer IDs or NPS/CSAT data uploads. Uses signals available in
the standard campaign CSV: funnel stages (imps, clicks, leads, mqls, sqls, conv),
channel, spend, region, time.

Output: list of CX opportunities with estimated $ impact, each traced to a
mechanism (funnel friction / orchestration gap / frequency fatigue).

Mechanisms:
1. FUNNEL FRICTION — drop-off rate between two stages materially below benchmark
2. ORCHESTRATION GAP — channel combinations converting better than single-channel but
   underserved in the current mix
3. FREQUENCY FATIGUE — inferred from per-channel spend intensity + conversion rate
   degradation over time (a channel with rising spend and falling conversion rate
   is a fatigue candidate)

Every opportunity carries a confidence tier (high / directional / inconclusive)
based on sample size and statistical significance of the underlying signal.

Libraries: scipy.stats (z-test, KS test), numpy, pandas
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from scipy import stats as sp_stats
import logging

logger = logging.getLogger(__name__)

# Industry benchmark conversion rates by stage transition
# (from funnel_analysis engine — kept consistent)
_BENCHMARKS = {
    ("Impressions", "Clicks"): 0.02,
    ("Clicks", "Leads"): 0.08,
    ("Leads", "MQLs"): 0.45,
    ("MQLs", "SQLs"): 0.38,
    ("SQLs", "Conversions"): 0.25,
}

# Thresholds
_FRICTION_GAP_THRESHOLD = 0.20      # 20% below benchmark = friction candidate
_FATIGUE_SPEND_GROWTH = 0.15        # 15% spend growth
_FATIGUE_CONV_DECLINE = 0.10        # 10% conversion rate decline
_MIN_SAMPLE_SIZE = 30               # below this, confidence drops


_COLUMN_ALIASES = {
    "impressions": "imps",
    "conversions": "conv",
}


_ACRONYM_OVERRIDES = {"tv": "TV", "ooh": "OOH", "ctv": "CTV", "ott": "OTT", "ai": "AI"}


def _pretty_channel(name: str) -> str:
    """
    Format a channel name for human display.

    Idempotent on already-formatted display names ("Paid Search" stays).
    Lowercase single-words ("email" → "Email") and snake_case
    ("paid_search" → "Paid Search") get normalized. Preserves short
    ALL-CAPS acronyms ("TV", "OOH", "CTV") and known lowercase acronyms
    from _ACRONYM_OVERRIDES.
    """
    if not name:
        return ""
    s = str(name)
    if "_" not in s and "-" not in s and any(ch.isupper() for ch in s):
        return s
    parts = s.replace("-", "_").split("_")
    if len(parts) == 1:
        p = parts[0]
        if p.lower() in _ACRONYM_OVERRIDES:
            return _ACRONYM_OVERRIDES[p.lower()]
        if len(p) <= 4 and p.isupper():
            return p
        return p.capitalize()
    out = []
    for p in parts:
        if not p:
            continue
        if p.lower() in _ACRONYM_OVERRIDES:
            out.append(_ACRONYM_OVERRIDES[p.lower()])
        elif len(p) <= 4 and p.isupper():
            out.append(p)
        else:
            out.append(p.capitalize())
    return " ".join(out)


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize column names to short form (imps, conv) so the engine works
    with both the v24 long-form schema (impressions, conversions) and
    the short-form schema used by newer data sources.
    Non-destructive — returns a new DataFrame reference.
    """
    if df is None or len(df) == 0:
        return df
    renames = {k: v for k, v in _COLUMN_ALIASES.items() if k in df.columns and v not in df.columns}
    if renames:
        return df.rename(columns=renames)
    return df


def _wilson_ci(successes: int, trials: int, confidence: float = 0.95) -> tuple:
    """Wilson score CI for proportion."""
    if trials == 0:
        return 0.0, 0.0
    p = successes / trials
    z = sp_stats.norm.ppf(1 - (1 - confidence) / 2)
    denom = 1 + z**2 / trials
    center = (p + z**2 / (2 * trials)) / denom
    spread = z * np.sqrt((p * (1 - p) + z**2 / (4 * trials)) / trials) / denom
    return max(0.0, center - spread), min(1.0, center + spread)


def _confidence_tier(sample_size: int, p_value: Optional[float]) -> str:
    """Map sample size + p-value to a user-facing confidence chip."""
    if sample_size < _MIN_SAMPLE_SIZE:
        return "inconclusive"
    if p_value is None:
        return "directional"
    if p_value < 0.05:
        return "high"
    if p_value < 0.15:
        return "directional"
    return "inconclusive"


def _friction_opportunities(df: pd.DataFrame) -> List[Dict]:
    """Find funnel-friction CX opportunities: drop-offs materially below benchmark."""
    opps = []
    stages = ["imps", "clicks", "leads", "mqls", "sqls", "conv"]
    labels = ["Impressions", "Clicks", "Leads", "MQLs", "SQLs", "Conversions"]
    alt = {"imps": "impressions", "conv": "conversions"}

    # Resolve which columns exist
    available_cols = []
    for s, label in zip(stages, labels):
        col = s if s in df.columns else alt.get(s, s)
        if col in df.columns:
            available_cols.append((col, label))

    if len(available_cols) < 2:
        return opps

    # Overall-funnel drop-off check
    totals = [int(df[col].sum()) for col, _ in available_cols]
    for i in range(1, len(available_cols)):
        prev_vol, curr_vol = totals[i - 1], totals[i]
        if prev_vol < _MIN_SAMPLE_SIZE:
            continue
        prev_label = available_cols[i - 1][1]
        curr_label = available_cols[i][1]
        actual_rate = curr_vol / prev_vol if prev_vol > 0 else 0
        benchmark = _BENCHMARKS.get((prev_label, curr_label))
        if benchmark is None:
            continue
        gap = (benchmark - actual_rate) / benchmark if benchmark > 0 else 0
        if gap < _FRICTION_GAP_THRESHOLD:
            continue

        # Statistical significance: one-sided z-test vs benchmark
        p_hat = actual_rate
        se = np.sqrt(benchmark * (1 - benchmark) / prev_vol)
        z_stat = (p_hat - benchmark) / max(se, 1e-10)
        p_value = float(sp_stats.norm.cdf(z_stat))  # probability we're BELOW benchmark

        # Estimated revenue impact: lost volume × downstream conversion chain × avg value
        # Chain downstream benchmark rates to compute expected conversions from recovered volume
        lost_volume = prev_vol * (benchmark - actual_rate)
        revenue_total = float(df["revenue"].sum()) if "revenue" in df.columns else 0.0
        conv_total = int(df["conv"].sum()) if "conv" in df.columns else 0
        avg_value_per_conv = revenue_total / max(conv_total, 1)

        # Product of remaining benchmark rates to get expected conversions per recovered unit
        downstream_rate = 1.0
        for j in range(i + 1, len(available_cols)):
            ds_label = available_cols[j][1]
            prev_ds_label = available_cols[j - 1][1]
            ds_bm = _BENCHMARKS.get((prev_ds_label, ds_label), 0.0)
            downstream_rate *= ds_bm

        est_lost_conversions = lost_volume * downstream_rate
        # Recovery factor — 50% of the gap is addressable through UX/creative/targeting fixes
        est_impact = est_lost_conversions * avg_value_per_conv * 0.5

        # Safety cap: CX friction at any single stage can't recover more than 20% of total revenue.
        # This prevents unrealistic outputs when the earliest-stage gap is multiplied through
        # a very long downstream chain with large volumes.
        est_impact = min(est_impact, revenue_total * 0.20)

        opps.append({
            "type": "funnel_friction",
            "pillar": "cx_uplift",
            "action_verb": "Fix Friction",
            "channel": f"{prev_label}→{curr_label}",  # funnel-stage transition, not a media channel
            "title": f"Fix {prev_label} → {curr_label} drop-off",
            "detail": (
                f"{prev_label}→{curr_label} rate {actual_rate:.1%} is {gap:.0%} below "
                f"benchmark ({benchmark:.1%}). Estimated {int(lost_volume):,} lost "
                f"{curr_label.lower()} per period."
            ),
            "estimated_impact": round(float(est_impact), 0),
            "confidence": _confidence_tier(prev_vol, p_value),
            "mechanism": "funnel_friction",
            "basis": {
                "actual_rate": round(float(actual_rate), 4),
                "benchmark": round(float(benchmark), 4),
                "gap_pct": round(float(gap * 100), 1),
                "p_value": round(float(p_value), 4),
                "sample_size": int(prev_vol),
            },
        })
    return opps


def _orchestration_opportunities(df: pd.DataFrame) -> List[Dict]:
    """
    Find orchestration-gap CX opportunities.

    Heuristic: for each channel, compare its solo conversion efficiency
    (conversion rate when high spend concentration) vs its efficiency during
    periods when other top channels are ALSO active (co-occurring spend).

    This approximates "journey lift" without requiring customer IDs.
    Channels that convert materially better when co-occurring with others are
    orchestration candidates.
    """
    opps = []
    if "channel" not in df.columns or "conv" not in df.columns:
        return opps
    time_col = "month" if "month" in df.columns else ("date" if "date" in df.columns else None)
    if not time_col:
        return opps

    # Per-period per-channel spend + conversions
    pvt = df.groupby([time_col, "channel"]).agg(
        spend=("spend", "sum"),
        conv=("conv", "sum") if "conv" in df.columns else ("revenue", "sum"),
        revenue=("revenue", "sum"),
    ).reset_index()
    if len(pvt) < _MIN_SAMPLE_SIZE:
        return opps

    # For each channel, determine its "solo" periods (only it active) vs "co-occurring" periods
    channels = pvt["channel"].unique()
    active_by_period = df.groupby(time_col)["channel"].apply(lambda x: set(x.unique())).to_dict()

    for ch in channels:
        ch_rows = pvt[pvt["channel"] == ch]
        if len(ch_rows) < 3:
            continue

        co_occurring_convs = []
        solo_convs = []
        for _, r in ch_rows.iterrows():
            period = r[time_col]
            active = active_by_period.get(period, {ch})
            co_count = len(active) - 1
            rate_proxy = r["conv"] / max(r["spend"], 1) if r["spend"] > 0 else 0
            if co_count >= 2:  # at least 2 other channels active
                co_occurring_convs.append(rate_proxy)
            elif co_count == 0:
                solo_convs.append(rate_proxy)

        if len(co_occurring_convs) < 2 or len(solo_convs) < 2:
            # Compare low vs high orchestration instead
            if len(ch_rows) < 6:
                continue
            # Sort periods by orchestration level
            ch_rows_sorted = []
            for _, r in ch_rows.iterrows():
                period = r[time_col]
                active_count = len(active_by_period.get(period, {ch}))
                rate_proxy = r["conv"] / max(r["spend"], 1) if r["spend"] > 0 else 0
                ch_rows_sorted.append((active_count, rate_proxy))
            ch_rows_sorted.sort(key=lambda x: x[0])
            mid = len(ch_rows_sorted) // 2
            solo_convs = [x[1] for x in ch_rows_sorted[:mid]]
            co_occurring_convs = [x[1] for x in ch_rows_sorted[mid:]]

        if len(co_occurring_convs) < 2 or len(solo_convs) < 2:
            continue

        mean_co = float(np.mean(co_occurring_convs))
        mean_solo = float(np.mean(solo_convs))
        if mean_solo <= 0:
            continue
        lift_ratio = mean_co / mean_solo
        if lift_ratio < 1.3:  # less than 30% multi-touch lift — not a meaningful opportunity
            continue

        # Statistical test
        try:
            _t_stat, p_value = sp_stats.ttest_ind(co_occurring_convs, solo_convs, equal_var=False)
            p_value = float(p_value)
        except Exception:
            p_value = None

        # Revenue impact estimate: if channel spent 50% more in co-occurring periods, what's the gain?
        ch_total_spend = float(ch_rows["spend"].sum())
        ch_total_rev = float(ch_rows["revenue"].sum())
        # Simple model: moving 20% of spend into orchestrated periods captures the lift differential
        est_impact = ch_total_rev * 0.20 * (lift_ratio - 1) * 0.5

        sample_size = len(co_occurring_convs) + len(solo_convs)
        opps.append({
            "type": "orchestration_gap",
            "pillar": "cx_uplift",
            "action_verb": "Orchestrate",
            "channel": _pretty_channel(ch),
            "title": f"Orchestrate {_pretty_channel(ch)} into multi-channel journeys",
            "detail": (
                f"{_pretty_channel(ch)} converts {lift_ratio:.1f}× better in co-occurring periods "
                f"vs solo. Currently ~{len(solo_convs)} periods show isolation."
            ),
            "estimated_impact": round(float(est_impact), 0),
            "confidence": _confidence_tier(sample_size, p_value),
            "mechanism": "orchestration_gap",
            "basis": {
                "lift_ratio": round(float(lift_ratio), 2),
                "co_occurring_periods": int(len(co_occurring_convs)),
                "solo_periods": int(len(solo_convs)),
                "p_value": round(float(p_value), 4) if p_value is not None else None,
                "sample_size": int(sample_size),
            },
        })
    return opps


def _frequency_fatigue_opportunities(df: pd.DataFrame) -> List[Dict]:
    """
    Find frequency-fatigue CX opportunities.

    A channel shows fatigue when:
    - Spend has grown materially over the observation window
    - Conversion rate (conv/spend) has declined
    - The decline is statistically supported by the data

    This is a proxy for over-frequency / creative fatigue / audience saturation.
    """
    opps = []
    if "channel" not in df.columns or "conv" not in df.columns:
        return opps
    time_col = "month" if "month" in df.columns else ("date" if "date" in df.columns else None)
    if not time_col:
        return opps

    for ch in df["channel"].unique():
        ch_df = df[df["channel"] == ch].groupby(time_col).agg(
            spend=("spend", "sum"),
            conv=("conv", "sum"),
            revenue=("revenue", "sum"),
        ).reset_index().sort_values(time_col)

        if len(ch_df) < 4:
            continue

        # Split into early and late halves
        mid = len(ch_df) // 2
        early = ch_df.iloc[:mid]
        late = ch_df.iloc[mid:]

        early_spend = float(early["spend"].sum())
        late_spend = float(late["spend"].sum())
        if early_spend <= 0:
            continue

        spend_growth = (late_spend - early_spend) / early_spend
        if spend_growth < _FATIGUE_SPEND_GROWTH:
            continue

        early_conv_rate = float(early["conv"].sum()) / max(early_spend, 1)
        late_conv_rate = float(late["conv"].sum()) / max(late_spend, 1)
        if early_conv_rate <= 0:
            continue

        conv_decline = (early_conv_rate - late_conv_rate) / early_conv_rate
        if conv_decline < _FATIGUE_CONV_DECLINE:
            continue

        # Statistical test: is the conversion rate decline significant?
        early_rates = (early["conv"] / early["spend"].replace(0, np.nan)).dropna().values
        late_rates = (late["conv"] / late["spend"].replace(0, np.nan)).dropna().values
        if len(early_rates) < 2 or len(late_rates) < 2:
            p_value = None
        else:
            try:
                _t, p_value = sp_stats.ttest_ind(early_rates, late_rates, equal_var=False)
                p_value = float(p_value)
            except Exception:
                p_value = None

        # Revenue-at-risk: if we capped spend at the efficient point, recoverable value ≈
        # the over-spend × current inefficiency
        efficient_spend = early_spend * (late_spend / early_spend) * (late_conv_rate / early_conv_rate)
        overspend = late_spend - efficient_spend
        late_rev = float(late["revenue"].sum())
        late_roas = late_rev / max(late_spend, 1)
        est_impact = max(0.0, overspend * late_roas * 0.3)  # recovery factor

        opps.append({
            "type": "frequency_fatigue",
            "pillar": "cx_uplift",
            "action_verb": "Cap Frequency",
            "channel": _pretty_channel(ch),
            "title": f"Cap {_pretty_channel(ch)} frequency — fatigue detected",
            "detail": (
                f"{_pretty_channel(ch)} spend grew {spend_growth:+.0%} while conversion rate fell "
                f"{conv_decline:.0%}. Over-frequency candidate."
            ),
            "estimated_impact": round(float(est_impact), 0),
            "confidence": _confidence_tier(len(ch_df), p_value),
            "mechanism": "frequency_fatigue",
            "basis": {
                "spend_growth_pct": round(float(spend_growth * 100), 1),
                "conv_decline_pct": round(float(conv_decline * 100), 1),
                "early_conv_rate": round(float(early_conv_rate), 6),
                "late_conv_rate": round(float(late_conv_rate), 6),
                "p_value": round(float(p_value), 4) if p_value is not None else None,
                "sample_size": int(len(ch_df)),
            },
        })
    return opps


def run_cx_analysis(df: pd.DataFrame) -> Dict:
    """
    Main entry point. Returns CX-pillar opportunities derived from campaign data.

    Output shape:
    {
        "pillar": "cx_uplift",
        "total_estimated_impact": float,   # sum of all opportunity impacts
        "opportunities": [ {...}, ... ],   # ranked by estimated_impact desc
        "metrics": {
            "journeys_at_risk": int,       # count of orchestration gaps
            "frequency_flags": int,        # count of fatigue channels
            "friction_points": int,        # count of funnel frictions
        },
    }
    """
    if df is None or len(df) == 0:
        return {
            "pillar": "cx_uplift",
            "total_estimated_impact": 0.0,
            "opportunities": [],
            "metrics": {"journeys_at_risk": 0, "frequency_flags": 0, "friction_points": 0},
        }

    df = _normalize_columns(df)

    try:
        friction = _friction_opportunities(df)
    except Exception as e:
        logger.warning(f"CX friction analysis failed: {e}")
        friction = []

    try:
        orchestration = _orchestration_opportunities(df)
    except Exception as e:
        logger.warning(f"CX orchestration analysis failed: {e}")
        orchestration = []

    try:
        fatigue = _frequency_fatigue_opportunities(df)
    except Exception as e:
        logger.warning(f"CX fatigue analysis failed: {e}")
        fatigue = []

    all_opps = friction + orchestration + fatigue
    all_opps.sort(key=lambda x: x["estimated_impact"], reverse=True)

    total_impact = sum(o["estimated_impact"] for o in all_opps)

    return {
        "pillar": "cx_uplift",
        "total_estimated_impact": round(float(total_impact), 0),
        "opportunities": all_opps,
        "metrics": {
            "journeys_at_risk": len(orchestration),
            "frequency_flags": len(fatigue),
            "friction_points": len(friction),
        },
    }
