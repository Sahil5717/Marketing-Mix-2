import { useMemo, useState } from "react";
import styled from "styled-components";
import { t } from "../tokens.js";
import {
  HeroRow,
  HeroLeft,
  HeroRight,
  Eyebrow,
  HeroHeadline,
  HeroLede,
} from "../ui/HeroRow.jsx";
import { KpiHero } from "../ui/KpiHero.jsx";
import { Byline } from "../ui/Byline.jsx";
import { Callout } from "../ui/Callout.jsx";
import { MoveCard } from "../ui/MoveCard.jsx";
import { SubNav, SubNavTab } from "../ui/SubNav.jsx";
import { TwoColumn, MainColumn, Sidebar } from "../ui/PageShell.jsx";

/**
 * Plan — redesigned per UX handoff + mockup Image 3.
 *
 * Structurally parallel to Diagnosis (same hero + subnav + two-column
 * body shape) but with prescriptive voice instead of diagnostic voice.
 *
 * Key differences from Diagnosis:
 *   - Hero headline answers "what do we do?" not "what's wrong?"
 *   - KPIs: Reallocation Size (primary/dark), Expected Revenue Lift
 *          (green delta), Plan Confidence (ConfidenceBar)
 *   - SubNav tabs: Moves / Tradeoffs / Phased Rollout
 *   - Body: Moves grouped by direction (Increase / Reduce / Hold) with
 *          section headers showing count + dollar total. Within a
 *          group, moves are in impact order.
 *   - Sidebar: "What could go wrong" callout (warning-toned, derives
 *             from tradeoffs[]) + Phasing card (month-by-month rollout)
 *
 * The MoveCard component doesn't expand — per handoff: "moves are
 * already the summary; for more detail the user clicks the channel
 * name to open Channel Detail." (Channel Detail ships Session 5.)
 */
export function Plan({
  data,
  editorMode = false,
  // Note: onCommentaryEdit / onSuppressToggle props are NOT wired on
  // Plan in v18h. Move-level editor annotations and suppression would
  // require extending MoveCard with an editor footer; finding-level
  // editing on Diagnosis is the primary v1 editor flow. Move-level
  // editing is queued for a future iteration.
}) {
  const [activeTab, setActiveTab] = useState("moves");

  if (!data) return null;

  const hero = data.hero || {};
  const kpis = data.kpis || {};
  const moves = data.moves || [];
  const tradeoffs = data.tradeoffs || [];

  // Filter suppressed moves in client view, show them dimmed in editor view
  const visibleMoves = editorMode ? moves : moves.filter((m) => !m.suppressed);

  // Group moves by action — matches the mockup's "Increase / Reduce / Hold" layout
  const grouped = useMemo(() => {
    const buckets = { increase: [], decrease: [], hold: [] };
    for (const m of visibleMoves) {
      const bucket = buckets[m.action] ? m.action : "hold";
      buckets[bucket].push(m);
    }
    // Within each bucket, sort by absolute revenue_delta descending
    for (const k of Object.keys(buckets)) {
      buckets[k].sort(
        (a, b) => Math.abs(b.revenue_delta || 0) - Math.abs(a.revenue_delta || 0)
      );
    }
    return buckets;
  }, [visibleMoves]);

  const headlineElements = useMemo(() => {
    const segments = hero.segments || [];
    return segments.map((seg, i) =>
      seg.emphasis ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>
    );
  }, [hero.segments]);

  const reallocationKpi = kpis.reallocation_size;
  const upliftKpi = kpis.expected_uplift;
  const confKpi = kpis.plan_confidence;

  return (
    <Main>
      {/* ── Hero ── */}
      <HeroRow>
        <HeroLeft>
          <Eyebrow>Plan · Recommended action</Eyebrow>

          <HeroHeadline>
            {headlineElements.length > 0 ? headlineElements : data.headline_paragraph}
          </HeroHeadline>

          {hero.lede && <HeroLede>{hero.lede}</HeroLede>}

          <Byline
            initials={(data.analyst?.initials) || "SR"}
            name={(data.analyst?.name) || "Sarah Rahman"}
            role={(data.analyst?.role) || "Senior Manager"}
            verb="Recommended by"
            meta={planMethodologyMeta(data.methodology)}
          />
        </HeroLeft>

        <HeroRight>
          {reallocationKpi && (
            <KpiHero
              primary
              label={reallocationKpi.label}
              value={reallocationKpi.display.replace(/^\$|M$/g, "")}
              unit={reallocationKpi.display.endsWith("M") ? "M" : ""}
              context={reallocationKpi.context}
            />
          )}
          {upliftKpi && (
            <KpiHero
              label={upliftKpi.label}
              value={upliftKpi.display.replace(/^\+?\$|M$/g, "")}
              unit={upliftKpi.display.endsWith("M") ? "M" : ""}
              context={upliftKpi.context}
              deltaText={
                data.summary?.uplift_pct != null
                  ? `+${data.summary.uplift_pct.toFixed(1)}% vs current plan`
                  : undefined
              }
              deltaDirection="up"
            />
          )}
          {confKpi && (
            <KpiHero
              label={confKpi.label}
              value={confKpi.display}
              context={confKpi.context}
              confidence={confKpi.display?.toLowerCase()}
            />
          )}
        </HeroRight>
      </HeroRow>

      {/* ── SubNav ── */}
      <SubNav>
        <SubNavTab
          label="Moves"
          count={visibleMoves.length}
          active={activeTab === "moves"}
          onClick={() => setActiveTab("moves")}
        />
        <SubNavTab
          label="Tradeoffs"
          count={tradeoffs.length || undefined}
          active={activeTab === "tradeoffs"}
          onClick={() => setActiveTab("tradeoffs")}
        />
        <SubNavTab
          label="Phased rollout"
          active={activeTab === "phasing"}
          onClick={() => setActiveTab("phasing")}
        />
      </SubNav>

      {/* ── Body ── */}
      <BodyShell>
        {activeTab === "moves" && (
          <TwoColumn>
            <MainColumn>
              {grouped.increase.length > 0 && (
                <MoveGroup
                  title="Increase"
                  moves={grouped.increase}
                  totalLabel={sumRevenueDelta(grouped.increase)}
                  direction="up"
                />
              )}
              {grouped.decrease.length > 0 && (
                <MoveGroup
                  title="Reduce"
                  moves={grouped.decrease}
                  totalLabel={sumRevenueDelta(grouped.decrease)}
                  direction="down"
                />
              )}
              {grouped.hold.length > 0 && (
                <MoveGroup
                  title="Hold"
                  moves={grouped.hold}
                  totalLabel={null}
                  direction="neutral"
                />
              )}
              {visibleMoves.length === 0 && (
                <EmptyState>No moves surfaced by this plan.</EmptyState>
              )}
            </MainColumn>

            <Sidebar>
              <WhatCouldGoWrongCard tradeoffs={tradeoffs} analyst={data.analyst} />
              <PhasingCard moves={visibleMoves} />
            </Sidebar>
          </TwoColumn>
        )}

        {activeTab === "tradeoffs" && <TradeoffsPane tradeoffs={tradeoffs} />}
        {activeTab === "phasing" && <PhasingPane moves={visibleMoves} />}
      </BodyShell>
    </Main>
  );
}

// ─── Sub-components ───

function MoveGroup({ title, moves, totalLabel, direction }) {
  return (
    <GroupWrap>
      <GroupHead>
        <GroupTitle>{title}</GroupTitle>
        <GroupCount>{moves.length} channel{moves.length === 1 ? "" : "s"}</GroupCount>
        {totalLabel && (
          <GroupTotal $direction={direction}>{totalLabel}</GroupTotal>
        )}
      </GroupHead>
      <GroupList>
        {moves.map((m) => (
          <MoveCard
            key={m.key}
            tier={reliabilityToTier(m.reliability)}
            channel={formatChannel(m.channel)}
            action={makeActionHtml(m)}
            deltaValue={m.revenue_delta_display || m.spend_delta_display}
            deltaPct={m.change_pct != null ? `${signed(m.change_pct)}%` : undefined}
            deltaDirection={m.action === "increase" ? "up" : m.action === "decrease" ? "down" : "neutral"}
            beforeSpend={formatMoneyShort(m.current_spend)}
            afterSpend={formatMoneyShort(m.optimized_spend)}
          />
        ))}
      </GroupList>
    </GroupWrap>
  );
}

/**
 * WhatCouldGoWrongCard — sidebar callout derived from tradeoffs[].
 * Takes the first warning-severity tradeoff and renders it as a
 * pull-quote. If there are no warnings, shows a confidence-boosting
 * message instead (don't leave the sidebar empty).
 */
function WhatCouldGoWrongCard({ tradeoffs, analyst }) {
  const warning = tradeoffs.find((tr) => tr.severity === "warning") || tradeoffs[0];
  const name = analyst?.name || "Sarah Rahman";
  if (!warning) {
    return (
      <Callout label="What could go wrong" byline={`${name}, reviewing analyst`}>
        No significant downside risks identified in this plan. The moves are within
        historically-observed spend ranges and carry high-confidence fits.
      </Callout>
    );
  }
  return (
    <Callout label="What could go wrong" byline={`${name}, reviewing analyst`}>
      {warning.narrative || warning.headline}
    </Callout>
  );
}

/**
 * PhasingCard — sidebar rollout timeline. For v1 we derive this from
 * the moves themselves: high-confidence moves go in Month 1, everything
 * else spans Month 2-3, inconclusive moves get an extra validation
 * phase in Month 4+.
 */
function PhasingCard({ moves }) {
  const phase1 = moves.filter((m) => m.reliability === "high" && m.action !== "hold");
  const phase2 = moves.filter((m) => m.reliability !== "high" && m.reliability !== "inconclusive" && m.action !== "hold");
  const phase3 = moves.filter((m) => m.reliability === "inconclusive");

  return (
    <SidebarCard>
      <SidebarLabel>Phasing</SidebarLabel>
      <PhaseList>
        {phase1.length > 0 && (
          <PhaseRow>
            <PhaseName>Month 1</PhaseName>
            <PhaseCopy>
              {phase1.slice(0, 2).map((m) => actionShort(m)).join(". ")}
              {phase1.length > 2 ? ` + ${phase1.length - 2} more` : ""}.
            </PhaseCopy>
          </PhaseRow>
        )}
        {phase2.length > 0 && (
          <PhaseRow>
            <PhaseName>Month 2–3</PhaseName>
            <PhaseCopy>
              Monitor impact of Month 1 moves, then phase in:{" "}
              {phase2.slice(0, 2).map((m) => actionShort(m)).join(", ")}.
            </PhaseCopy>
          </PhaseRow>
        )}
        {phase3.length > 0 && (
          <PhaseRow>
            <PhaseName>Month 4+</PhaseName>
            <PhaseCopy>
              Run incrementality validation on {phase3.slice(0, 2).map((m) => formatChannel(m.channel)).join(", ")}
              {phase3.length > 2 ? ` + ${phase3.length - 2} more` : ""}. Adjust if uplift lags projections.
            </PhaseCopy>
          </PhaseRow>
        )}
        {phase1.length + phase2.length + phase3.length === 0 && (
          <PhaseCopy>Rollout plan available once moves are finalized.</PhaseCopy>
        )}
      </PhaseList>
    </SidebarCard>
  );
}

function TradeoffsPane({ tradeoffs }) {
  if (!tradeoffs.length) {
    return <EmptyState>No tradeoffs identified for this plan.</EmptyState>;
  }
  return (
    <PaneWrap>
      {tradeoffs.map((tr, i) => (
        <TradeoffRow key={tr.key || `tr-${i}`} $severity={tr.severity}>
          <TradeoffHead>{tr.headline}</TradeoffHead>
          <TradeoffBody>{tr.narrative}</TradeoffBody>
        </TradeoffRow>
      ))}
    </PaneWrap>
  );
}

function PhasingPane({ moves }) {
  const phase1 = moves.filter((m) => m.reliability === "high" && m.action !== "hold");
  const phase2 = moves.filter((m) => m.reliability !== "high" && m.reliability !== "inconclusive" && m.action !== "hold");
  const phase3 = moves.filter((m) => m.reliability === "inconclusive");

  return (
    <PaneWrap>
      <PhaseBlock>
        <PhaseBlockHead>Month 1 — High-confidence moves</PhaseBlockHead>
        <PhaseBlockCopy>
          {phase1.length === 0 ? "No high-confidence moves to phase in." : (
            <ul>
              {phase1.map((m) => (
                <li key={m.key}>{actionSentence(m)}</li>
              ))}
            </ul>
          )}
        </PhaseBlockCopy>
      </PhaseBlock>

      <PhaseBlock>
        <PhaseBlockHead>Month 2–3 — Directional moves, phased</PhaseBlockHead>
        <PhaseBlockCopy>
          {phase2.length === 0 ? "No directional moves queued." : (
            <ul>
              {phase2.map((m) => (
                <li key={m.key}>{actionSentence(m)}</li>
              ))}
            </ul>
          )}
        </PhaseBlockCopy>
      </PhaseBlock>

      <PhaseBlock>
        <PhaseBlockHead>Month 4+ — Validation required before scaling</PhaseBlockHead>
        <PhaseBlockCopy>
          {phase3.length === 0 ? "No moves requiring pre-scaling validation." : (
            <ul>
              {phase3.map((m) => (
                <li key={m.key}>
                  {actionSentence(m)} Run geo-holdout before scaling beyond 50% of target.
                </li>
              ))}
            </ul>
          )}
        </PhaseBlockCopy>
      </PhaseBlock>
    </PaneWrap>
  );
}

// ─── Helpers ───

function reliabilityToTier(r) {
  const l = String(r || "").toLowerCase();
  if (l === "high") return "high";
  if (l === "inconclusive" || l === "low") return "inconclusive";
  return "directional";
}

function formatChannel(ch) {
  if (!ch) return "";
  return ch.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMoneyShort(n) {
  if (n == null) return null;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function signed(n) {
  if (n == null) return "";
  return n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
}

function sumRevenueDelta(moves) {
  const total = moves.reduce((s, m) => s + (m.revenue_delta || 0), 0);
  if (total === 0) return null;
  const sign = total > 0 ? "+" : "-";
  const abs = Math.abs(total);
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${Math.round(abs / 1e3)}K`;
}

function actionShort(m) {
  const ch = formatChannel(m.channel);
  if (m.action === "increase") return `Scale ${ch}`;
  if (m.action === "decrease") return `Pull back on ${ch}`;
  return `Hold ${ch}`;
}

function actionSentence(m) {
  const ch = formatChannel(m.channel);
  const before = formatMoneyShort(m.current_spend);
  const after = formatMoneyShort(m.optimized_spend);
  if (m.action === "increase") return `Increase ${ch} from ${before} to ${after} (+${m.change_pct?.toFixed(0)}%).`;
  if (m.action === "decrease") return `Reduce ${ch} from ${before} to ${after} (${m.change_pct?.toFixed(0)}%).`;
  return `Hold ${ch} at ${before}.`;
}

function makeActionHtml(m) {
  // Generates the action sentence with bolded key figures (the mockup
  // bolds dollar amounts and phase-in qualifiers). Returned as a raw
  // HTML string because MoveCard supports dangerouslySetInnerHTML for
  // this inline bolding pattern.
  const ch = formatChannel(m.channel);
  const before = escapeHtml(formatMoneyShort(m.current_spend) || "");
  const after = escapeHtml(formatMoneyShort(m.optimized_spend) || "");
  if (m.action === "increase") {
    return `Increase spend from <strong>${before}</strong> to <strong>${after}</strong>. ${descriptor(m)}`;
  }
  if (m.action === "decrease") {
    return `Pull back from <strong>${before}</strong> to <strong>${after}</strong>. ${descriptor(m)}`;
  }
  return `Hold at <strong>${before}</strong>. ${descriptor(m)}`;
}

function descriptor(m) {
  const n = m.narrative || "";
  // Shorten the narrative to one sentence for the card view
  const firstSentence = n.split(/[.!?]/)[0];
  return escapeHtml(firstSentence ? firstSentence + "." : "");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function planMethodologyMeta(methodology) {
  if (!methodology || methodology.length === 0) return null;
  const engines = methodology.map((m) => m.engine).slice(0, 3);
  return `Based on ${engines.join(" · ")}`;
}

// ─── Styled ───

const Main = styled.main`
  min-height: 100vh;
  background: ${t.color.canvas};
  animation: mlFadeIn ${t.motion.slow} ${t.motion.ease};
`;

const BodyShell = styled.div`
  max-width: ${t.layout.maxWidth};
  margin: 0 auto;
  padding: ${t.space[8]} ${t.layout.pad.wide} ${t.space[16]};

  @media (max-width: ${t.layout.bp.wide}) {
    padding-left: ${t.layout.pad.narrow};
    padding-right: ${t.layout.pad.narrow};
  }
`;

const GroupWrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${t.space[3]};
  margin-bottom: ${t.space[8]};

  &:last-child {
    margin-bottom: 0;
  }
`;

const GroupHead = styled.header`
  display: flex;
  align-items: baseline;
  gap: ${t.space[3]};
  padding: 0 ${t.space[1]};
`;

const GroupTitle = styled.h3`
  font-family: ${t.font.body};
  font-size: ${t.size.md};
  font-weight: ${t.weight.semibold};
  color: ${t.color.ink};
  letter-spacing: ${t.tracking.snug};
  margin: 0;
`;

const GroupCount = styled.span`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink3};
  font-weight: ${t.weight.regular};
`;

const GroupTotal = styled.span`
  margin-left: auto;
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  font-weight: ${t.weight.semibold};
  color: ${({ $direction }) =>
    $direction === "up" ? t.color.positive :
    $direction === "down" ? t.color.negative :
    t.color.ink3};
`;

const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${t.space[3]};
`;

const EmptyState = styled.div`
  padding: ${t.space[10]} ${t.space[6]};
  background: ${t.color.surface};
  border: 1px dashed ${t.color.border};
  border-radius: ${t.radius.md};
  text-align: center;
  color: ${t.color.ink3};
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
`;

const SidebarCard = styled.aside`
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.md};
  padding: ${t.space[5]} ${t.space[5]};
  box-shadow: ${t.shadow.card};
`;

const SidebarLabel = styled.div`
  font-family: ${t.font.body};
  font-size: ${t.size.xs};
  font-weight: ${t.weight.semibold};
  color: ${t.color.ink3};
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wider};
  margin-bottom: ${t.space[4]};
`;

const PhaseList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${t.space[4]};
`;

const PhaseRow = styled.li`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PhaseName = styled.span`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  font-weight: ${t.weight.semibold};
  color: ${t.color.ink};
`;

const PhaseCopy = styled.span`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink2};
  line-height: ${t.leading.normal};
`;

const PaneWrap = styled.div`
  max-width: ${t.layout.readingWidth};
  display: flex;
  flex-direction: column;
  gap: ${t.space[4]};
`;

const TradeoffRow = styled.article`
  padding: ${t.space[5]} ${t.space[6]};
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-left: 3px solid ${({ $severity }) =>
    $severity === "warning" ? t.color.warning :
    $severity === "critical" ? t.color.negative :
    t.color.accent};
  border-radius: ${t.radius.md};
  box-shadow: ${t.shadow.card};
`;

const TradeoffHead = styled.h4`
  font-family: ${t.font.body};
  font-size: ${t.size.md};
  font-weight: ${t.weight.semibold};
  color: ${t.color.ink};
  margin: 0 0 ${t.space[2]} 0;
`;

const TradeoffBody = styled.p`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink2};
  line-height: ${t.leading.relaxed};
  margin: 0;
`;

const PhaseBlock = styled.section`
  padding: ${t.space[5]} ${t.space[6]};
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.md};
  box-shadow: ${t.shadow.card};
`;

const PhaseBlockHead = styled.h4`
  font-family: ${t.font.body};
  font-size: ${t.size.xs};
  font-weight: ${t.weight.semibold};
  color: ${t.color.accent};
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wider};
  margin: 0 0 ${t.space[3]} 0;
`;

const PhaseBlockCopy = styled.div`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink};
  line-height: ${t.leading.relaxed};

  ul {
    list-style: disc;
    padding-left: ${t.space[5]};
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: ${t.space[2]};
  }
`;
