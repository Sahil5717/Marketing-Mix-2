import { useEffect, useState } from "react";
import styled from "styled-components";
import { t } from "./tokens.js";
import { AppHeader } from "./ui/AppHeader.jsx";
import {
  DiagnosisHero,
  KpiTile,
  PillarCard,
  MarketContextTile,
  NextStepsTile,
} from "./ui/v2";

/**
 * DiagnosisV2 — the redesigned Diagnosis screen (v5 mockup match).
 *
 * Data source: /api/v2/diagnosis
 *
 * Structure top to bottom:
 *   1. AppHeader (existing component, nav highlights Diagnosis)
 *   2. Hero: eyebrow + serif headline + reviewer line
 *   3. 5-tile KPI strip (Marketing ROI · ROAS · MER · Mkt-driven % · LTV:CAC)
 *   4. Section header "Where the recoverable value is"
 *   5. 3-pillar card grid (Revenue Uplift · Cost Reduction · CX Uplift)
 *   6. Bottom split: MarketContextTile + NextStepsTile
 *
 * This component is DECOUPLED from the legacy Diagnosis.jsx — they run
 * side-by-side during the v24→v25 parallel deployment. Legacy consumes
 * /api/diagnosis, v2 consumes /api/v2/diagnosis.
 *
 * Routing between screens within v25 uses ?screen= query param for now
 * (matches the legacy convention). onNavigate is passed a screen key
 * which the router translates to a URL.
 */

const Canvas = styled.div`
  background: ${t.color.canvas};
  min-height: 100vh;
  font-family: ${t.fontV2.body};
  color: ${t.color.ink};
`;

const Page = styled.main`
  max-width: ${t.layout.maxWidth};
  margin: 0 auto;
  padding: 32px ${t.layout.pad.wide} 80px;

  @media (max-width: ${t.layout.bp.narrow}) {
    padding: 28px ${t.layout.pad.narrow} 60px;
  }
`;

const KpiStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 26px;
  margin-bottom: 36px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 18px;
`;

const SectionTitle = styled.h2`
  font-family: ${t.fontV2.headline};
  font-size: 20px;
  font-weight: 600;
  color: ${t.color.ink};
  margin: 0;
`;

const SectionSub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink3};
  margin-top: 3px;
`;

const SortGroup = styled.div`
  display: inline-flex;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.md};
  padding: 2px;
`;

const SortChip = styled.button`
  display: inline-block;
  font-family: ${t.fontV2.body};
  font-size: 11px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: ${t.radius.sm};
  color: ${({ $active }) => ($active ? t.color.ink : t.color.ink3)};
  background: ${({ $active }) => ($active ? t.color.canvas : "transparent")};
  border: none;
  cursor: pointer;
  transition: color ${t.motion.base} ${t.motion.ease},
              background ${t.motion.base} ${t.motion.ease};
`;

const PillarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 30px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr;
  }
`;

const SplitRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr;
  }
`;

const LoadingPane = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: ${t.color.ink3};
  font-family: ${t.fontV2.body};
  font-size: 14px;
`;

const ErrorPane = styled.div`
  margin-top: 24px;
  padding: 20px 24px;
  background: ${t.color.negativeBg};
  border: 1px solid ${t.color.negative};
  border-radius: ${t.radius.lg};
  color: ${t.color.negative};
  font-family: ${t.fontV2.body};
  font-size: 13px;
`;

const METHODOLOGY_BY_PILLAR = {
  revenue_uplift: "Verified via Bayesian MMM",
  cost_reduction: "Verified via Bayesian MMM",
  cx_uplift: "Derived from journey analytics",
};

function formatMillions(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

function formatDate(d = new Date()) {
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function DiagnosisV2({ onNavigate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [sortKey, setSortKey] = useState("impact");

  useEffect(() => {
    fetch("/api/v2/diagnosis")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  const go = (screen, params = {}) => {
    if (onNavigate) onNavigate(screen, params);
    else {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", screen);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
      window.location.href = url.toString();
    }
  };

  if (err) {
    return (
      <Canvas>
        <AppHeader currentScreen="diagnosis" v2Mode />
        <Page>
          <ErrorPane>
            Could not load diagnosis data: {err}. Make sure the backend is running
            and you've hit <code>/api/load-mock-data</code> and{" "}
            <code>/api/run-analysis</code>.
          </ErrorPane>
        </Page>
      </Canvas>
    );
  }

  if (!data) {
    return (
      <Canvas>
        <AppHeader currentScreen="diagnosis" v2Mode />
        <Page>
          <LoadingPane>Loading Diagnosis…</LoadingPane>
        </Page>
      </Canvas>
    );
  }

  const { hero, kpis, pillars, pillar_order, market_context_summary, reviewer } = data;
  const k = kpis;
  const pillarBlocks = pillar_order.map((pk) => pillars[pk]);

  // Hero headline composition — mixes live data into the templated copy.
  const headline = `Portfolio ROAS is <em>${k.portfolio_roas.value}×</em> — above benchmark. But <em>${formatMillions(hero.total_recoverable)}</em> is recoverable across three decision areas.`;

  const nextSteps = [
    {
      label: "Primary action",
      name: "Apply recommended plan",
      sub: `${hero.opportunity_count} moves · ${formatMillions(hero.total_recoverable)} projected lift across 3 pillars`,
      primary: true,
      onClick: () => go("plan"),
    },
    {
      label: "Compare options",
      name: "Open Scenarios",
      sub: "Baseline · Recommended · Aggressive",
      onClick: () => go("scenarios"),
    },
    {
      label: "Engagement history",
      name: "Review all past engagements",
      sub: "Recent activity · switch clients",
      onClick: () => go("engagements"),
    },
  ];

  return (
    <Canvas>
      <AppHeader
        currentScreen="diagnosis"
        v2Mode
        engagementMeta={{ client: "Acme Retail", period: "Q3 2026" }}
      />
      <Page>
        <DiagnosisHero
          eyebrow={`Diagnosis · reviewed ${formatDate().toLowerCase()}`}
          headline={headline}
          reviewer={reviewer}
        />

        {/* 5-tile KPI strip */}
        <KpiStrip>
          <KpiTile
            label="Marketing ROI"
            value={k.marketing_roi.value}
            unit={k.marketing_roi.unit}
            delta={k.marketing_roi.delta}
            deltaUnit={k.marketing_roi.unit}
            deltaDir={k.marketing_roi.delta_direction}
            sub="vs last quarter"
            onClick={() => go("channels")}
          />
          <KpiTile
            label="Portfolio ROAS"
            value={k.portfolio_roas.value}
            unit={k.portfolio_roas.unit}
            delta={k.portfolio_roas.delta}
            deltaUnit={k.portfolio_roas.unit}
            deltaDir={k.portfolio_roas.delta_direction}
            sub="vs last quarter"
            onClick={() => go("channels")}
          />
          <KpiTile
            label="MER"
            value={k.mer.value}
            unit={k.mer.unit}
            delta={k.mer.delta}
            deltaUnit={k.mer.unit}
            deltaDir={k.mer.delta_direction}
            sub="Marketing Efficiency Ratio"
            onClick={() => go("channels")}
          />
          <KpiTile
            label="Mkt-driven revenue"
            value={k.mkt_driven_revenue_pct.value}
            unit={k.mkt_driven_revenue_pct.unit}
            delta={k.mkt_driven_revenue_pct.delta}
            deltaUnit="pts"
            deltaDir={k.mkt_driven_revenue_pct.delta_direction}
            sub="of total attributable revenue"
            onClick={() => go("channels")}
          />
          <KpiTile
            label="LTV : CAC"
            unavailable={!k.ltv_cac.available}
            value={k.ltv_cac.value}
            unit={k.ltv_cac.available ? "×" : undefined}
            cta={k.ltv_cac.cta ? `${k.ltv_cac.cta} →` : undefined}
          />
        </KpiStrip>

        {/* Section: Where the recoverable value is */}
        <SectionHeader>
          <div>
            <SectionTitle>Where the recoverable value is</SectionTitle>
            <SectionSub>
              Three decision areas, ranked by dollar impact · Click any pillar
              for full drilldown
            </SectionSub>
          </div>
          <SortGroup>
            <SortChip $active={sortKey === "impact"} onClick={() => setSortKey("impact")}>
              $ Impact
            </SortChip>
            <SortChip $active={sortKey === "urgency"} onClick={() => setSortKey("urgency")}>
              Urgency
            </SortChip>
            <SortChip $active={sortKey === "confidence"} onClick={() => setSortKey("confidence")}>
              Confidence
            </SortChip>
          </SortGroup>
        </SectionHeader>

        <PillarGrid>
          {pillarBlocks.map((p) => (
            <PillarCard
              key={p.pillar}
              data={p}
              methodologyLabel={METHODOLOGY_BY_PILLAR[p.pillar] || "Model-derived"}
              onShowAll={() => go(p.pillar === "cx_uplift" ? "channels" : "plan")}
              onOpportunityClick={(opp) => {
                // Opportunity click → Channel Detail for the channel named
                // in the opportunity. Fallback to Plan if no channel reference
                // or if the "channel" is a funnel-stage transition (e.g. "Impressions→Clicks").
                const ch = opp.channel;
                if (ch && ch !== "Journey" && ch !== "Unknown" && !ch.includes("→")) {
                  // Convert "Paid Search" back to "paid_search" for URL param
                  const chParam = ch.toLowerCase().replace(/\s+/g, "_");
                  go("channels", { ch: chParam });
                } else {
                  go("plan");
                }
              }}
            />
          ))}
        </PillarGrid>

        {/* Bottom split row: Market Context + Next Steps */}
        <SplitRow>
          <MarketContextTile
            data={market_context_summary}
            onOpenMarketContext={() => go("market")}
          />
          <NextStepsTile steps={nextSteps} />
        </SplitRow>
      </Page>
    </Canvas>
  );
}
