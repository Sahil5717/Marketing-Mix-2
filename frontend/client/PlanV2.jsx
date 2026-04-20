import { useEffect, useState } from "react";
import styled from "styled-components";
import { t } from "./tokens.js";
import { AppHeader } from "./ui/AppHeader.jsx";
import {
  DiagnosisHero,
  KpiTile,
  PlanMoveRow,
  MarketOverlayBanner,
} from "./ui/v2";

/**
 * PlanV2 — the redesigned Plan screen (v5 mockup match).
 *
 * Data source: /api/v2/plan
 *
 * Structure top to bottom:
 *   1. AppHeader (Plan tab active)
 *   2. Hero: eyebrow + serif headline + reviewer line
 *   3. 5-tile KPI strip (Expected lift · Channels moving · Spend shift ·
 *      Plan confidence · Execute by)
 *   4. Market Overlay banner (4 signal cards + net impact + link to Market Context)
 *   5. Section header "Moves grouped by pillar"
 *   6. Three pillar groups, each containing PlanMoveRows
 *   7. Bottom split: "Open Scenarios" + "Back to Diagnosis" tiles
 *
 * Companion to DiagnosisV2 — same data backbone (3 pillars), different lens
 * (actions to take vs opportunities identified).
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
  margin-bottom: 30px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin: 30px 0 16px;
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

const FilterGroup = styled.div`
  display: inline-flex;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.md};
  padding: 2px;
`;

const FilterChip = styled.button`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: ${t.radius.sm};
  border: none;
  cursor: pointer;
  background: ${({ $active }) => ($active ? t.color.canvas : "transparent")};
  color: ${({ $active }) => ($active ? t.color.ink : t.color.ink3)};
  transition: color ${t.motion.base} ${t.motion.ease},
              background ${t.motion.base} ${t.motion.ease};
`;

const PillarGroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 26px 0 12px;
`;

const PillarGroupTitle = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 16px;
  font-weight: 600;
  color: ${t.color.ink};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PillarDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $accent }) => $accent};
`;

const PillarCount = styled.span`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};
  font-weight: 500;
  margin-left: 6px;
`;

const PillarSubtotal = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 16px;
  font-weight: 600;
  color: ${({ $accent }) => $accent};
`;

const SplitRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 30px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr;
  }
`;

const RelatedTile = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  padding: 22px 24px;
  cursor: pointer;
  transition: border-color ${t.motion.base} ${t.motion.ease},
              box-shadow ${t.motion.base} ${t.motion.ease};

  &:hover {
    border-color: ${t.color.borderStrong};
    box-shadow: ${t.shadow.card};
  }
`;

const RelatedLink = styled.span`
  position: absolute;
  top: 20px;
  right: 24px;
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.accent};
  font-weight: 600;

  &::after {
    content: " →";
  }
`;

const RelatedLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const RelatedHeadline = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 17px;
  font-weight: 600;
  color: ${t.color.ink};
  margin-bottom: 6px;
`;

const RelatedBody = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  color: ${t.color.ink2};
  line-height: 1.5;
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

const PILLAR_ACCENT = {
  revenue_uplift: t.color.pillarRev,
  cost_reduction: t.color.pillarCost,
  cx_uplift: t.color.pillarCx,
};

const PILLAR_LABEL = {
  revenue_uplift: "Revenue Uplift",
  cost_reduction: "Cost Reduction",
  cx_uplift: "CX Uplift",
};

function formatMoney(n) {
  if (n == null) return "—";
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

function formatPlusMoney(n) {
  if (n == null) return "—";
  const v = Number(n) || 0;
  if (v < 0) return `-${formatMoney(Math.abs(v))}`;
  return `+${formatMoney(v)}`;
}

export default function PlanV2({ onNavigate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/v2/plan")
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
        <AppHeader currentScreen="plan" v2Mode />
        <Page>
          <ErrorPane>
            Could not load plan data: {err}. Make sure the backend is running
            and analysis has completed.
          </ErrorPane>
        </Page>
      </Canvas>
    );
  }

  if (!data) {
    return (
      <Canvas>
        <AppHeader currentScreen="plan" v2Mode />
        <Page>
          <LoadingPane>Loading Plan…</LoadingPane>
        </Page>
      </Canvas>
    );
  }

  const { hero, kpis, market_overlay, moves_by_pillar, pillar_order, reviewer } = data;

  const headline = `<em>${formatPlusMoney(hero.expected_lift)}</em> expected lift across <em>${hero.moves_count}</em> moves — ${hero.channels_moving} of ${hero.channels_total} channels reallocated.`;

  // Find the KPI tiles by label (backend gives them in order, but referencing by label is safer)
  const kpi = (label) => kpis.find((k) => k.label === label) || {};
  const kExpected = kpi("Expected lift");
  const kChannels = kpi("Channels moving");
  const kShift = kpi("Spend shift");
  const kConf = kpi("Plan confidence");
  const kExec = kpi("Execute by");

  // Pillar visibility based on filter
  const showPillar = (pk) => filter === "all" || filter === pk;

  return (
    <Canvas>
      <AppHeader
        currentScreen="plan"
        v2Mode
        engagementMeta={{ client: "Acme Retail", period: "Q3 2026" }}
      />
      <Page>
        <DiagnosisHero
          eyebrow="Plan · recommended reallocation"
          headline={headline}
          reviewer={
            reviewer && {
              name: reviewer.name,
              role: reviewer.role,
              channels: reviewer.channels_count,
              campaigns: `${reviewer.weeks_of_data} weeks of data`,
            }
          }
        />

        {/* 5-tile KPI strip */}
        <KpiStrip>
          <KpiTile
            label={kExpected.label}
            value={formatPlusMoney(kExpected.value)}
            sub={kExpected.sub}
          />
          <KpiTile
            label={kChannels.label}
            value={kChannels.value}
            secondary={kChannels.denom != null ? `of ${kChannels.denom}` : undefined}
            sub={kChannels.sub}
          />
          <KpiTile
            label={kShift.label}
            value={formatMoney(kShift.value)}
            sub={kShift.sub}
          />
          <KpiTile
            label={kConf.label}
            value={kConf.value}
            sub={kConf.sub}
          />
          <KpiTile
            label={kExec.label}
            value={kExec.value}
            sub={kExec.sub}
          />
        </KpiStrip>

        {/* Market overlay banner */}
        <MarketOverlayBanner
          data={market_overlay}
          onOpenMarketContext={() => go("market")}
        />

        {/* Section header with filter */}
        <SectionHeader>
          <div>
            <SectionTitle>Moves grouped by pillar</SectionTitle>
            <SectionSub>
              {hero.moves_count} actions · ranked by dollar impact · click any
              move for channel drilldown
            </SectionSub>
          </div>
          <FilterGroup>
            <FilterChip $active={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterChip>
            <FilterChip
              $active={filter === "revenue_uplift"}
              onClick={() => setFilter("revenue_uplift")}
            >
              Revenue
            </FilterChip>
            <FilterChip
              $active={filter === "cost_reduction"}
              onClick={() => setFilter("cost_reduction")}
            >
              Cost
            </FilterChip>
            <FilterChip
              $active={filter === "cx_uplift"}
              onClick={() => setFilter("cx_uplift")}
            >
              CX
            </FilterChip>
          </FilterGroup>
        </SectionHeader>

        {/* Pillar groups */}
        {pillar_order.filter(showPillar).map((pk) => {
          const group = moves_by_pillar[pk] || { moves: [], count: 0, headline_value: 0 };
          const accent = PILLAR_ACCENT[pk];
          if (group.count === 0) {
            return (
              <div key={pk}>
                <PillarGroupHeader>
                  <PillarGroupTitle>
                    <PillarDot $accent={accent} />
                    {PILLAR_LABEL[pk]}
                    <PillarCount>0 moves</PillarCount>
                  </PillarGroupTitle>
                  <PillarSubtotal $accent={accent}>—</PillarSubtotal>
                </PillarGroupHeader>
                <RelatedBody style={{ marginBottom: 14, fontStyle: "italic", color: t.color.ink3 }}>
                  No material moves in this pillar for the current period.
                </RelatedBody>
              </div>
            );
          }
          return (
            <div key={pk}>
              <PillarGroupHeader>
                <PillarGroupTitle>
                  <PillarDot $accent={accent} />
                  {PILLAR_LABEL[pk]}
                  <PillarCount>
                    {group.count} move{group.count === 1 ? "" : "s"}
                  </PillarCount>
                </PillarGroupTitle>
                <PillarSubtotal $accent={accent}>
                  {formatPlusMoney(group.headline_value)}
                </PillarSubtotal>
              </PillarGroupHeader>

              {group.moves.map((m, idx) => (
                <PlanMoveRow
                  key={`${pk}-${idx}`}
                  pillar={pk}
                  actionVerb={m.action_verb}
                  channel={m.channel}
                  title={m.title}
                  detail={m.detail}
                  currentSpend={m.current_spend}
                  recommendedSpend={m.recommended_spend}
                  changePct={m.change_pct}
                  impact={m.impact}
                  confidence={m.confidence}
                  urgencyDays={m.urgency_days}
                  onClick={() => {
                    if (m.channel && m.channel !== "Journey" && !m.channel.includes("→")) {
                      const chParam = m.channel.toLowerCase().replace(/\s+/g, "_");
                      go("channels", { ch: chParam });
                    } else {
                      go("diagnosis");
                    }
                  }}
                />
              ))}
            </div>
          );
        })}

        {/* Bottom split row */}
        <SplitRow>
          <RelatedTile onClick={() => go("scenarios")}>
            <RelatedLink>Open Scenarios</RelatedLink>
            <RelatedLabel>Compare this plan</RelatedLabel>
            <RelatedHeadline>See baseline + aggressive alternatives</RelatedHeadline>
            <RelatedBody>
              This plan is the optimizer-recommended balance of upside and
              confidence. Scenarios shows a Baseline (hold steady) and an
              Aggressive (add new spend) for side-by-side comparison.
            </RelatedBody>
          </RelatedTile>

          <RelatedTile onClick={() => go("diagnosis")}>
            <RelatedLink>Back to Diagnosis</RelatedLink>
            <RelatedLabel>Where these moves came from</RelatedLabel>
            <RelatedHeadline>
              Diagnosis identified {formatPlusMoney(hero.expected_lift)} recoverable
            </RelatedHeadline>
            <RelatedBody>
              Every move on this plan traces back to an opportunity surfaced in
              Diagnosis. Review underlying methodology, data, and confidence
              for each recommendation.
            </RelatedBody>
          </RelatedTile>
        </SplitRow>
      </Page>
    </Canvas>
  );
}
