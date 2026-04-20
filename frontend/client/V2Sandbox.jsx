// V2 components smoke test page.
// Mount this at /v2-sandbox during development to visually verify all
// components render with the real API payload.
//
// Not included in the production build by default — see index-client-v2.html
// (added separately) if we want this as a live URL.

import { useEffect, useState } from "react";
import styled from "styled-components";
import { t } from "./tokens.js";
import {
  ActionChip,
  ConfidenceChip,
  KpiTile,
  OpportunityRow,
  PillarCard,
  MarketContextTile,
  NextStepsTile,
  DiagnosisHero,
} from "./ui/v2";

const Page = styled.div`
  max-width: ${t.layout.maxWidth};
  margin: 0 auto;
  padding: 32px 40px;
  background: ${t.color.canvas};
  min-height: 100vh;
  font-family: ${t.fontV2.body};
  color: ${t.color.ink};
`;

const Section = styled.section`
  margin-bottom: 40px;
`;

const H2 = styled.h2`
  font-family: ${t.fontV2.headline};
  font-size: 20px;
  font-weight: 600;
  margin: 24px 0 12px 0;
  color: ${t.color.ink};
  padding-bottom: 8px;
  border-bottom: 2px solid ${t.color.border};
`;

const Grid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const Grid5 = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
`;

// Hardcoded fallback data so the page renders without backend
const FALLBACK_DATA = {
  hero: { total_recoverable: 14100000, portfolio_roas: 2.8, opportunity_count: 20 },
  kpis: {
    marketing_roi: { value: 3.4, delta: 0.3, delta_direction: "up", unit: "×" },
    portfolio_roas: { value: 2.8, delta: -0.2, delta_direction: "down", unit: "×" },
    mer: { value: 4.2, delta: null, delta_direction: "flat", unit: "×" },
    mkt_driven_revenue_pct: { value: 42, delta: null, delta_direction: "flat", unit: "%" },
    ltv_cac: { value: null, available: false, cta: "Upload customer data →" },
  },
  pillars: {
    revenue_uplift: {
      pillar: "revenue_uplift",
      headline_value: 9200000,
      opportunity_count: 11,
      caption: "Recoverable by reallocating spend toward channels with unused response-curve headroom.",
      metrics: { primary_label: "Under-invested", primary_value: "6 of 12",
                 secondary_label: "Marginal ROAS", secondary_value: "4.1×" },
      opportunities: [
        { title: "Reallocate $2.4M into Email from Paid Search", detail: "Email marginal ROAS 5.2× vs Paid Search 1.9×.",
          estimated_impact: 3800000, action_verb: "Shift", confidence: "high" },
        { title: "Increase Social Paid spend by 32%", detail: "Social Paid operates far below efficient frontier.",
          estimated_impact: 2600000, action_verb: "Scale", confidence: "high" },
        { title: "Scale Events budget for Diwali 2026 window", detail: "+22% baseline lift in 44 days.",
          estimated_impact: 1800000, action_verb: "Scale", confidence: "directional", urgency_days: 44 },
      ],
    },
    cost_reduction: {
      pillar: "cost_reduction",
      headline_value: 3100000,
      opportunity_count: 5,
      caption: "Saveable by reducing spend on channels showing diminishing returns.",
      metrics: { primary_label: "Above saturation", primary_value: "3 channels",
                 secondary_label: "Weighted CPC", secondary_value: "+14% YoY" },
      opportunities: [
        { title: "Reduce Paid Search spend by 18%", detail: "CPC +22% YoY; past efficient frontier.",
          estimated_impact: 1400000, action_verb: "Cut Spend", confidence: "high" },
        { title: "Renegotiate Display CPM with partners", detail: "Rate card 17% above benchmark.",
          estimated_impact: 900000, action_verb: "Renegotiate", confidence: "directional" },
        { title: "Cut Direct Mail frequency by 25%", detail: "Sharp diminishing returns past current frequency.",
          estimated_impact: 600000, action_verb: "Reduce Freq", confidence: "directional" },
      ],
    },
    cx_uplift: {
      pillar: "cx_uplift",
      headline_value: 1800000,
      opportunity_count: 4,
      caption: "Recoverable by fixing journey friction and over-frequency risks.",
      metrics: { primary_label: "Journeys at risk", primary_value: "2",
                 secondary_label: "Frequency flags", secondary_value: "1 channel" },
      opportunities: [
        { title: "Orchestrate TV → Search → Email journey", detail: "Multi-touch journeys convert 4.2× single-channel.",
          estimated_impact: 900000, action_verb: "Orchestrate", confidence: "directional" },
        { title: "Cap Paid Social frequency at 6/week", detail: "Current 9.4/week triggers CX fatigue.",
          estimated_impact: 500000, action_verb: "Cap Freq", confidence: "directional" },
        { title: "Reduce cross-channel lag at funnel mid-stage", detail: "34% drop between engagement and consideration.",
          estimated_impact: 400000, action_verb: "Fix Lag", confidence: "inconclusive" },
      ],
    },
  },
  pillar_order: ["revenue_uplift", "cost_reduction", "cx_uplift"],
  market_context_summary: {
    events_count: 3,
    upcoming_events: [
      { name: "Competitor IPL sponsorship", when: "In 19 days", impact_pct: -8, direction: "down" },
      { name: "Diwali 2026", when: "In 44 days", impact_pct: 22, direction: "up" },
      { name: "Black Friday 2026", when: "In 2 months", impact_pct: 18, direction: "up" },
    ],
    cost_alerts_count: 3,
    top_alert: { title: "Paid Search CPC up 22% YoY",
                 body: "CPC has increased 22% year-over-year ($1.85 → $2.25). Same budget buys 18% fewer clicks." },
  },
  reviewer: { name: "Sarah Rahman", role: "Senior Manager", channels: 12, campaigns: 34 },
};

export default function V2Sandbox() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch("/api/v2/diagnosis")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch((e) => {
        setErr(`Using fallback data (live API: ${e})`);
        setData(FALLBACK_DATA);
      });
  }, []);

  if (!data) return <Page>Loading…</Page>;
  const k = data.kpis;
  const pillars = data.pillar_order.map((pk) => data.pillars[pk]);

  const nextSteps = [
    { label: "Primary action", name: "Apply recommended plan",
      sub: `${data.hero.opportunity_count} moves · projected lift across 3 pillars`,
      primary: true, onClick: () => alert("→ /plan") },
    { label: "Compare options", name: "Open Scenarios",
      sub: "Baseline · Recommended · Aggressive", onClick: () => alert("→ /scenarios") },
    { label: "Engagement history", name: "Review all past engagements",
      sub: "Recent activity", onClick: () => alert("→ /engagements") },
  ];

  return (
    <Page>
      {err && <div style={{ color: t.color.warning, marginBottom: 16, fontSize: 12 }}>{err}</div>}

      <DiagnosisHero
        eyebrow="Diagnosis · reviewed 20 Apr 2026"
        headline={`Portfolio ROAS is <em>${k.portfolio_roas.value}×</em> — above benchmark. But <em>$${(data.hero.total_recoverable / 1e6).toFixed(1)}M</em> is recoverable across three decision areas.`}
        reviewer={data.reviewer}
      />

      <Section>
        <H2>KPI strip (5 tiles)</H2>
        <Grid5>
          <KpiTile label="Marketing ROI" value={k.marketing_roi.value} unit="×"
            delta={k.marketing_roi.delta} deltaDir={k.marketing_roi.delta_direction}
            sub="vs last quarter" onClick={() => alert("drill marketing_roi")} />
          <KpiTile label="Portfolio ROAS" value={k.portfolio_roas.value} unit="×"
            delta={k.portfolio_roas.delta} deltaDir={k.portfolio_roas.delta_direction}
            sub="vs last quarter" onClick={() => alert("drill roas")} />
          <KpiTile label="MER" value={k.mer.value} unit="×"
            sub="Marketing Efficiency Ratio" onClick={() => alert("drill mer")} />
          <KpiTile label="Mkt-driven revenue" value={k.mkt_driven_revenue_pct.value} unit="%"
            sub="of total attributable revenue" onClick={() => alert("drill mktdriven")} />
          <KpiTile label="LTV : CAC" unavailable cta={k.ltv_cac.cta} />
        </Grid5>
      </Section>

      <Section>
        <H2>Pillar cards (3)</H2>
        <Grid3>
          {pillars.map((p) => (
            <PillarCard
              key={p.pillar}
              data={p}
              methodologyLabel={p.pillar === "cx_uplift" ? "Derived from journey analytics" : "Verified via Bayesian MMM"}
              onShowAll={() => alert(`show all ${p.pillar}`)}
              onOpportunityClick={(o) => alert(`drill: ${o.title}`)}
            />
          ))}
        </Grid3>
      </Section>

      <Section>
        <H2>Bottom split row</H2>
        <Grid2>
          <MarketContextTile
            data={data.market_context_summary}
            onOpenMarketContext={() => alert("→ /market-context")}
          />
          <NextStepsTile steps={nextSteps} />
        </Grid2>
      </Section>

      <Section>
        <H2>Chip atoms (quick reference)</H2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ActionChip pillar="revenue_uplift">Shift</ActionChip>
          <ActionChip pillar="revenue_uplift">Scale</ActionChip>
          <ActionChip pillar="cost_reduction">Cut Spend</ActionChip>
          <ActionChip pillar="cost_reduction">Renegotiate</ActionChip>
          <ActionChip pillar="cx_uplift">Orchestrate</ActionChip>
          <ActionChip pillar="cx_uplift">Fix Lag</ActionChip>
          <ConfidenceChip tier="high" />
          <ConfidenceChip tier="directional" />
          <ConfidenceChip tier="inconclusive" />
          <ConfidenceChip tier="urgent" days={44} />
        </div>
      </Section>
    </Page>
  );
}
