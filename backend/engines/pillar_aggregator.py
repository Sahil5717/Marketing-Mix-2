"""
Pillar Aggregator — Production Grade
=======================================
Reshapes outputs from the existing engines (leakage, optimizer, automated_recs,
market_adjustments) plus the new CX engine into the three-pillar structure
displayed on the Diagnosis screen:

    1. Revenue Uplift   — recoverable by reallocating to under-invested channels
    2. Cost Reduction   — saveable by cutting spend on saturated / high-CPC channels
    3. CX Uplift        — recoverable by fixing journey friction & over-frequency

This is a pure view-layer transformation — it does not do any statistical
analysis of its own. It reads results that other engines have already produced
and arranges them for the UI.

Output shape per pillar (matches mockup):
    {
        "pillar": "revenue_uplift" | "cost_reduction" | "cx_uplift",
        "headline_value": float,          # total $ across this pillar
        "opportunity_count": int,
        "caption": str,                   # short description
        "metrics": {                      # two-metric tile shown under headline
            "primary_label": str, "primary_value": str,
            "secondary_label": str, "secondary_value": str,
        },
        "opportunities": [                # ranked by dollar impact
            {
                "channel": str,
                "title": str,             # e.g. "Reallocate $2.4M into Email from Paid Search"
                "detail": str,
                "estimated_impact": float,
                "action_verb": str,       # for the action chip
                "confidence": "high" | "directional" | "inconclusive",
                "urgency_days": Optional[int],  # if tied to a market event window
            },
            ...
        ],
    }

Libraries: numpy, pandas (no new deps)
"""
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


_ACRONYM_OVERRIDES = {"tv": "TV", "ooh": "OOH", "ctv": "CTV", "ott": "OTT", "ai": "AI"}


def _pretty(name: str) -> str:
    """
    Format a snake_case channel name for human display.

    Idempotent on already-formatted display names: "Paid Search" stays
    "Paid Search", but lowercase single-word channels like "email" or
    "ooh" still get title-cased. Preserves short ALL-CAPS acronyms
    like "TV", "OOH", "CTV".
    """
    if not name:
        return "Unknown"
    s = str(name)
    # Already in display form: contains uppercase AND no separators → leave alone
    if "_" not in s and "-" not in s and any(ch.isupper() for ch in s):
        return s
    # Otherwise normalize: split on separators, capitalize each part,
    # preserve short ALL-CAPS acronyms and known mixed-case acronyms.
    parts = s.replace("-", "_").split("_")
    # Single-word lowercase ("email") → just title-case the whole thing
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


def _classify_confidence_from_pct_gap(change_pct: float) -> str:
    """
    Map spend-change magnitude to a confidence tier.
    Larger magnitudes = stronger signal = higher confidence.
    """
    abs_pct = abs(change_pct)
    if abs_pct >= 25:
        return "high"
    if abs_pct >= 10:
        return "directional"
    return "inconclusive"


def build_revenue_pillar(
    optimizer_result: Dict,
    automated_recs: Optional[List[Dict]] = None,
    response_curves: Optional[Dict] = None,
) -> Dict:
    """
    Revenue Uplift pillar — under-invested channels with response-curve headroom.
    """
    channels = optimizer_result.get("channels", []) if optimizer_result else []
    underfunded = [c for c in channels if c.get("change_pct", 0) > 5]

    def _rev_uplift(c):
        # v24 optimizer returns "revenue_delta"; older/test fixtures use "revenue_uplift"
        return c.get("revenue_uplift", c.get("revenue_delta",
            c.get("optimized_revenue", 0) - c.get("current_revenue", 0)))

    underfunded.sort(key=_rev_uplift, reverse=True)

    opportunities = []
    for c in underfunded:
        ch_raw = c.get("channel", "Unknown")
        ch = _pretty(ch_raw)
        current_spend = float(c.get("current_spend", 0))
        optimal_spend = float(c.get("optimized_spend", 0))
        change_pct = float(c.get("change_pct", 0))
        spend_delta = optimal_spend - current_spend
        revenue_uplift = float(_rev_uplift(c))
        if revenue_uplift <= 0:
            continue

        if current_spend < 1e6 or change_pct > 100:
            # "Scale" when channel is either currently small or seeing a proportionally large increase
            action_verb = "Scale"
            title = f"Scale {ch} spend by {change_pct:+.0f}%"
            detail = (
                f"{ch} operates below efficient frontier; "
                f"optimizer recommends +${spend_delta/1e6:.1f}M."
            )
        else:
            # "Shift" when channel is already material and gets a modest increase funded by cuts elsewhere
            action_verb = "Shift"
            title = f"Reallocate ${spend_delta/1e6:.1f}M into {ch}"
            detail = (
                f"{ch} has unused response-curve headroom. "
                f"Recommended spend +{change_pct:.0f}% to capture marginal ROAS."
            )

        opportunities.append({
            "channel": ch,
            "title": title,
            "detail": detail,
            "estimated_impact": round(revenue_uplift, 0),
            "action_verb": action_verb,
            "confidence": _classify_confidence_from_pct_gap(change_pct),
            "urgency_days": None,
        })

    # Merge in urgency-tagged recommendations (e.g. festival window from automated_recs)
    if automated_recs:
        for r in automated_recs:
            if r.get("pillar") == "revenue_uplift" and r.get("urgency_days"):
                opportunities.append({
                    "channel": r.get("channel", "Unknown"),
                    "title": r.get("title", ""),
                    "detail": r.get("detail", ""),
                    "estimated_impact": round(float(r.get("estimated_impact", 0)), 0),
                    "action_verb": r.get("action_verb", "Scale"),
                    "confidence": r.get("confidence", "directional"),
                    "urgency_days": r.get("urgency_days"),
                })

    opportunities.sort(key=lambda x: x["estimated_impact"], reverse=True)
    headline = sum(o["estimated_impact"] for o in opportunities)

    # Compute pillar metrics
    total_channels = len(channels)
    # v24 optimizer returns "marginal_roi"; our schema prefers "marginal_roas" — accept either
    marginal_roas_values = [c.get("marginal_roas", c.get("marginal_roi"))
                             for c in channels
                             if c.get("marginal_roas") is not None or c.get("marginal_roi") is not None]
    marginal_roas_values = [v for v in marginal_roas_values if v is not None]
    avg_marginal_roas = sum(marginal_roas_values) / len(marginal_roas_values) if marginal_roas_values else 0

    return {
        "pillar": "revenue_uplift",
        "headline_value": round(float(headline), 0),
        "opportunity_count": len(opportunities),
        "caption": (
            "Recoverable by reallocating spend toward channels with unused "
            "response-curve headroom."
        ),
        "metrics": {
            "primary_label": "Under-invested",
            "primary_value": f"{len(underfunded)} of {total_channels}",
            "secondary_label": "Marginal ROAS",
            "secondary_value": f"{avg_marginal_roas:.1f}×" if avg_marginal_roas > 0 else "—",
        },
        "opportunities": opportunities,
    }


def build_cost_pillar(
    optimizer_result: Dict,
    automated_recs: Optional[List[Dict]] = None,
    market_adjustments: Optional[Dict] = None,
) -> Dict:
    """
    Cost Reduction pillar — over-invested channels past saturation or with rising unit costs.
    """
    channels = optimizer_result.get("channels", []) if optimizer_result else []
    overfunded = [c for c in channels if c.get("change_pct", 0) < -5]

    def _cost_saving(c):
        # Direct cost saving = current spend freed up by the optimizer
        current = float(c.get("current_spend", 0))
        optimized = float(c.get("optimized_spend", 0))
        savings = max(0, current - optimized)
        return c.get("cost_saving", savings)

    overfunded.sort(key=_cost_saving, reverse=True)

    opportunities = []
    for c in overfunded:
        ch_raw = c.get("channel", "Unknown")
        ch = _pretty(ch_raw)
        current_spend = float(c.get("current_spend", 0))
        change_pct = float(c.get("change_pct", 0))
        cost_saving = float(_cost_saving(c))
        if cost_saving <= 0:
            continue

        title = f"Reduce {ch} spend by {abs(change_pct):.0f}%"
        detail = (
            f"{ch} is past the efficient frontier. "
            f"Current spend ${current_spend/1e6:.1f}M vs recommended ${float(c.get('optimized_spend', 0))/1e6:.1f}M."
        )
        opportunities.append({
            "channel": ch,
            "title": title,
            "detail": detail,
            "estimated_impact": round(cost_saving, 0),
            "action_verb": "Cut Spend",
            "confidence": _classify_confidence_from_pct_gap(change_pct),
            "urgency_days": None,
        })

    # Pull in CPM / CPC negotiation recs from market adjustments
    if market_adjustments:
        cost_trends = market_adjustments.get("cost_trends", [])
        for trend in cost_trends:
            if trend.get("direction") == "down" and trend.get("opportunity_value", 0) > 0:
                ch = _pretty(trend.get("channel", "Unknown"))
                opportunities.append({
                    "channel": ch,
                    "title": f"Renegotiate {ch} {trend.get('metric', 'CPM')}",
                    "detail": trend.get("explanation", ""),
                    "estimated_impact": round(float(trend.get("opportunity_value", 0)), 0),
                    "action_verb": "Renegotiate",
                    "confidence": "directional",
                    "urgency_days": None,
                })

    # Pull in frequency-cut recs from automated_recs (over-frequency → cost wastage)
    if automated_recs:
        for r in automated_recs:
            if r.get("pillar") == "cost_reduction" and r.get("action_verb") == "Reduce Freq":
                opportunities.append({
                    "channel": r.get("channel", "Unknown"),
                    "title": r.get("title", ""),
                    "detail": r.get("detail", ""),
                    "estimated_impact": round(float(r.get("estimated_impact", 0)), 0),
                    "action_verb": "Reduce Freq",
                    "confidence": r.get("confidence", "directional"),
                    "urgency_days": None,
                })

    opportunities.sort(key=lambda x: x["estimated_impact"], reverse=True)
    headline = sum(o["estimated_impact"] for o in opportunities)

    # Pillar metrics
    above_saturation_count = sum(1 for c in channels if c.get("past_saturation", False) or c.get("change_pct", 0) < -15)
    # Weighted average CPC YoY change — from market_adjustments if available
    cpc_delta_pct = 0
    if market_adjustments:
        for t in market_adjustments.get("cost_trends", []):
            if "cpc" in str(t.get("metric", "")).lower():
                cpc_delta_pct = float(t.get("yoy_change_pct", 0))
                break

    return {
        "pillar": "cost_reduction",
        "headline_value": round(float(headline), 0),
        "opportunity_count": len(opportunities),
        "caption": (
            "Saveable by reducing spend on channels showing diminishing returns "
            "or rising unit costs."
        ),
        "metrics": {
            "primary_label": "Above saturation",
            "primary_value": f"{above_saturation_count} channel{'s' if above_saturation_count != 1 else ''}",
            "secondary_label": "Weighted CPC",
            "secondary_value": f"{cpc_delta_pct:+.0f}% YoY" if cpc_delta_pct else "—",
        },
        "opportunities": opportunities,
    }


def build_cx_pillar(cx_result: Dict) -> Dict:
    """
    CX Uplift pillar — consumes output of cx_engine.run_cx_analysis directly.
    Reshapes into the mockup-compatible structure.
    """
    if not cx_result:
        return {
            "pillar": "cx_uplift",
            "headline_value": 0,
            "opportunity_count": 0,
            "caption": "",
            "metrics": {"primary_label": "Journeys at risk", "primary_value": "0",
                        "secondary_label": "Frequency flags", "secondary_value": "0"},
            "opportunities": [],
        }

    opportunities = []
    for o in cx_result.get("opportunities", []):
        opportunities.append({
            "channel": o.get("title", "").split(" ")[-1] if o.get("type") == "frequency_fatigue" else "Journey",
            "title": o["title"],
            "detail": o["detail"],
            "estimated_impact": round(float(o["estimated_impact"]), 0),
            "action_verb": o["action_verb"],
            "confidence": o["confidence"],
            "urgency_days": None,
        })

    metrics = cx_result.get("metrics", {})
    return {
        "pillar": "cx_uplift",
        "headline_value": round(float(cx_result.get("total_estimated_impact", 0)), 0),
        "opportunity_count": len(opportunities),
        "caption": (
            "Recoverable by fixing journey friction and over-frequency risks "
            "across touchpoints."
        ),
        "metrics": {
            "primary_label": "Journeys at risk",
            "primary_value": str(metrics.get("journeys_at_risk", 0)),
            "secondary_label": "Frequency flags",
            "secondary_value": f"{metrics.get('frequency_flags', 0)} channel{'s' if metrics.get('frequency_flags', 0) != 1 else ''}",
        },
        "opportunities": opportunities,
    }


def aggregate_all_pillars(
    optimizer_result: Dict,
    cx_result: Dict,
    automated_recs: Optional[List[Dict]] = None,
    market_adjustments: Optional[Dict] = None,
    response_curves: Optional[Dict] = None,
) -> Dict:
    """
    Main entry point. Builds all three pillars and returns the Diagnosis-shaped payload.

    Output:
    {
        "hero": {
            "total_recoverable": float,
            "pillar_count": 3,
            "opportunity_count": int,
        },
        "pillars": {
            "revenue_uplift": {...},
            "cost_reduction": {...},
            "cx_uplift": {...},
        },
        "pillar_order": ["revenue_uplift", "cost_reduction", "cx_uplift"],  # always this order
    }
    """
    revenue = build_revenue_pillar(optimizer_result, automated_recs, response_curves)
    cost = build_cost_pillar(optimizer_result, automated_recs, market_adjustments)
    cx = build_cx_pillar(cx_result)

    total_recoverable = revenue["headline_value"] + cost["headline_value"] + cx["headline_value"]
    total_opportunities = revenue["opportunity_count"] + cost["opportunity_count"] + cx["opportunity_count"]

    return {
        "hero": {
            "total_recoverable": round(float(total_recoverable), 0),
            "pillar_count": 3,
            "opportunity_count": total_opportunities,
        },
        "pillars": {
            "revenue_uplift": revenue,
            "cost_reduction": cost,
            "cx_uplift": cx,
        },
        "pillar_order": ["revenue_uplift", "cost_reduction", "cx_uplift"],
    }
