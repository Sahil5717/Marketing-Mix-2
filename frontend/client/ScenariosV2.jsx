import { useEffect, useState } from "react";
import styled from "styled-components";
import { t } from "./tokens.js";
import { AppHeader } from "./ui/AppHeader.jsx";
import {
  DiagnosisHero,
  ScenarioCard,
  ChannelComparisonTable,
} from "./ui/v2";

/**
 * ScenariosV2 — the redesigned Scenarios screen (v5 mockup match).
 *
 * Data source: /api/v2/scenarios
 *
 * Structure:
 *   1. AppHeader (Scenarios tab active)
 *   2. Hero + reviewer line
 *   3. View toggle ($ Impact / Pillar split / Risk profile) — cosmetic, no-op in MVP
 *   4. 3-column ScenarioCard grid (Baseline / Recommended / Aggressive)
 *   5. Channel comparison table with totals row + apply-plan CTA
 *   6. Bottom split row: "Open Plan" + "Open Market Context"
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
  padding: 28px ${t.layout.pad.wide} 80px;

  @media (max-width: ${t.layout.bp.narrow}) {
    padding: 24px ${t.layout.pad.narrow} 60px;
  }
`;

const ToggleRow = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
`;

const Toggle = styled.div`
  display: inline-flex;
  background: ${t.color.surface};
  border-radius: ${t.radius.md};
  padding: 2px;
  border: 1px solid ${t.color.border};
`;

const ToggleChip = styled.button`
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

const ScenariosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 30px;
  margin-bottom: 30px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr;
  }
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
`;

const RelatedLink = styled.a`
  position: absolute;
  top: 20px;
  right: 24px;
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.accent};
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;

  &::after { content: " →"; }
  &:hover { color: ${t.color.accentHover}; }
`;

const RelatedTitle = styled.div`
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
  padding-right: 140px;
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

export default function ScenariosV2({ onNavigate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [viewMode, setViewMode] = useState("impact");
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    fetch("/api/v2/scenarios")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        // Initial selection follows what the backend says is selected
        const sel = (d.scenarios || []).find((s) => s.selected);
        if (sel) setSelectedKey(sel.key);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  const go = (screen) => {
    if (onNavigate) onNavigate(screen);
    else window.location.search = `?screen=${screen}`;
  };

  if (err) {
    return (
      <Canvas>
        <AppHeader currentScreen="scenarios" />
        <Page>
          <ErrorPane>
            Could not load scenarios: {err}. Make sure the backend is running and
            you've hit <code>/api/load-mock-data</code> and{" "}
            <code>/api/run-analysis</code>.
          </ErrorPane>
        </Page>
      </Canvas>
    );
  }

  if (!data) {
    return (
      <Canvas>
        <AppHeader currentScreen="scenarios" />
        <Page>
          <LoadingPane>Loading Scenarios…</LoadingPane>
        </Page>
      </Canvas>
    );
  }

  const { hero, scenarios, channel_table, reviewer } = data;

  const lift = hero.recommended_lift || 0;
  const liftDisplay =
    lift >= 1e6 ? `$${(lift / 1e6).toFixed(1)}M` : `$${Math.round(lift / 1e3)}K`;

  const headline = `Compare <em>three paths forward</em> — Optimizer plan projects <em>${liftDisplay}</em> lift vs baseline.`;

  return (
    <Canvas>
      <AppHeader
        currentScreen="scenarios"
        engagementMeta={{ client: "Acme Retail", period: "Q3 2026" }}
      />
      <Page>
        <DiagnosisHero
          eyebrow="Scenarios · compare budget options"
          headline={headline}
          reviewer={
            reviewer
              ? {
                  name: reviewer.name,
                  role: reviewer.role,
                  channels: reviewer.channels_modeled,
                  campaigns: `Bayesian MMM · ${reviewer.hdi_pct}% HDI`,
                }
              : null
          }
        />

        <ToggleRow>
          <Toggle>
            <ToggleChip $active={viewMode === "impact"} onClick={() => setViewMode("impact")}>
              $ Impact
            </ToggleChip>
            <ToggleChip $active={viewMode === "pillar"} onClick={() => setViewMode("pillar")}>
              Pillar split
            </ToggleChip>
            <ToggleChip $active={viewMode === "risk"} onClick={() => setViewMode("risk")}>
              Risk profile
            </ToggleChip>
          </Toggle>
        </ToggleRow>

        <ScenariosGrid>
          {scenarios.map((s, idx) => (
            <ScenarioCard
              key={s.key}
              scenario={s}
              optionNumber={idx + 1}
              isUiSelected={selectedKey === s.key}
              onSelect={() => setSelectedKey(s.key)}
              onDrill={() => go(s.key === "baseline" ? "diagnosis" : "plan")}
            />
          ))}
        </ScenariosGrid>

        <ChannelComparisonTable
          data={channel_table}
          onOpenChannels={() => go("channels")}
          onApplyPlan={() => go("plan")}
        />

        <SplitRow>
          <RelatedTile>
            <RelatedLink onClick={() => go("plan")}>Open Plan</RelatedLink>
            <RelatedTitle>Selected scenario</RelatedTitle>
            <RelatedHeadline>
              {selectedKey === "baseline"
                ? "Hold baseline · $0 · 0 moves"
                : selectedKey === "aggressive"
                ? `Aggressive growth · +${liftDisplay}+ · ${scenarios.find((s) => s.key === "aggressive")?.moves_count ?? 0} moves`
                : `Optimizer plan · +${liftDisplay} · ${scenarios.find((s) => s.key === "recommended")?.moves_count ?? 0} moves`}
            </RelatedHeadline>
            <RelatedBody>
              Full move-by-move breakdown of the selected scenario, grouped by
              pillar. Each move includes confidence, action type, and spend delta.
            </RelatedBody>
          </RelatedTile>
          <RelatedTile>
            <RelatedLink onClick={() => go("market")}>Open Market Context</RelatedLink>
            <RelatedTitle>What changes between scenarios</RelatedTitle>
            <RelatedHeadline>Market overlay applied consistently</RelatedHeadline>
            <RelatedBody>
              All three scenarios apply the same market signals: event windows,
              cost trends, and competitive activity. Scenarios differ only in
              budget and spend allocation.
            </RelatedBody>
          </RelatedTile>
        </SplitRow>
      </Page>
    </Canvas>
  );
}
