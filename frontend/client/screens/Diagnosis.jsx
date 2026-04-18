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
import { FindingCard } from "../ui/FindingCard.jsx";
import { SubNav, SubNavTab } from "../ui/SubNav.jsx";
import { PageShell, TwoColumn, MainColumn, Sidebar } from "../ui/PageShell.jsx";
import { ConfidenceBar } from "../ui/ConfidenceBar.jsx";

/**
 * Diagnosis — redesigned per UX handoff + mockup Image 2.
 *
 * Structure:
 *   Hero (two columns)
 *     Left: eyebrow + answer-first serif headline + lede + byline
 *     Right: 3 KPI cards (Portfolio ROAS primary/dark, Value at Risk,
 *            Plan Confidence with ConfidenceBar)
 *   SubNav (3 tabs)
 *     Findings · Channel performance · Data & assumptions
 *   Body (2 columns)
 *     Main: findings head + stacked FindingCards
 *     Sidebar: Editor's Take Callout + Confidence by Finding list
 *
 * Editor mode behavior is threaded through:
 *   - Suppressed findings appear (dimmed) instead of being hidden
 *   - Each FindingCard shows Add/Edit note + Hide buttons in a footer strip
 *   - onCommentaryEdit / onSuppressToggle callbacks handle persistence
 *
 * This component is rendered by both DiagnosisApp (client view, no
 * editor affordances) and EditorApp (editor view, with affordances).
 * The `editorMode` prop toggles the affordances.
 */
export function Diagnosis({
  data,
  editorMode = false,
  onCommentaryEdit,
  onSuppressToggle,
}) {
  // Body tab state — URL-based routing is future work; keep it local
  // for now to match the mockup's behavior
  const [activeTab, setActiveTab] = useState("findings");

  if (!data) return null;

  const hero = data.hero || {};
  const kpis = data.kpis || {};
  const findings = data.findings || [];
  const visibleFindings = editorMode
    ? findings
    : findings.filter((f) => !f.suppressed);

  // Render hero segments — plain text and emphasis (italic accent) fragments
  const headlineElements = useMemo(() => {
    const segments = hero.segments || [];
    return segments.map((seg, i) =>
      seg.emphasis ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>
    );
  }, [hero.segments]);

  const portfolioKpi = kpis.portfolio_roas;
  const varKpi = kpis.value_at_risk;
  const confKpi = kpis.plan_confidence;

  return (
    <Main>
      {/* ── Hero ── */}
      <HeroRow>
        <HeroLeft>
          <Eyebrow>
            Diagnosis · Reviewed {data.reviewed_at || formatToday()}
          </Eyebrow>

          <HeroHeadline>
            {headlineElements.length > 0 ? headlineElements : data.headline_paragraph}
          </HeroHeadline>

          {hero.lede && <HeroLede>{hero.lede}</HeroLede>}

          <Byline
            initials={(data.analyst?.initials) || "SR"}
            name={(data.analyst?.name) || "Sarah Rahman"}
            role={(data.analyst?.role) || "Senior Manager"}
            verb="Reviewed by"
            meta={formatCoverageMeta(data.data_coverage)}
          />
        </HeroLeft>

        <HeroRight>
          {portfolioKpi && (
            <KpiHero
              primary
              label={portfolioKpi.label}
              value={portfolioKpi.display.replace(/x$/i, "")}
              unit={portfolioKpi.display.match(/x$/i) ? "×" : ""}
              context={portfolioKpi.benchmark ? `Retail benchmark ${portfolioKpi.benchmark}` : undefined}
              deltaText={portfolioKpi.delta_text}
              deltaDirection={portfolioKpi.delta_direction}
            />
          )}
          {varKpi && (
            <KpiHero
              label={varKpi.label}
              value={varKpi.display.replace(/^\$|M$/g, "")}
              unit={varKpi.display.endsWith("M") ? "M" : ""}
              context={varKpi.pct_of_revenue ? `${varKpi.pct_of_revenue}% of attributable revenue` : undefined}
              deltaText={varKpi.tone === "warning" ? "Recoverable via reallocation" : undefined}
              deltaDirection="down"
            />
          )}
          {confKpi && (
            <KpiHero
              label={confKpi.label}
              value={confKpi.display}
              context={confKpi.r_squared ? `Model R² = ${confKpi.r_squared}` : "Based on fit quality of underlying models"}
              confidence={confKpi.display?.toLowerCase()}
            />
          )}
        </HeroRight>
      </HeroRow>

      {/* ── SubNav ── */}
      <SubNav>
        <SubNavTab
          label="Findings"
          count={visibleFindings.length}
          active={activeTab === "findings"}
          onClick={() => setActiveTab("findings")}
        />
        <SubNavTab
          label="Channel performance"
          active={activeTab === "channels"}
          onClick={() => setActiveTab("channels")}
        />
        <SubNavTab
          label="Data & assumptions"
          active={activeTab === "data"}
          onClick={() => setActiveTab("data")}
        />
      </SubNav>

      {/* ── Body ── */}
      <BodyShell>
        {activeTab === "findings" && (
          <TwoColumn>
            <MainColumn>
              <FindingsHead>
                <FindingsTitle>What the analysis surfaces</FindingsTitle>
                <FindingsMeta>
                  {editorMode
                    ? "Ranked by estimated impact. Click a finding to add commentary or hide from client."
                    : "Ranked by estimated impact."}
                </FindingsMeta>
              </FindingsHead>

              {visibleFindings.length === 0 && (
                <EmptyState>No findings surfaced by this analysis.</EmptyState>
              )}

              {visibleFindings.map((f, i) => (
                <FindingCard
                  key={f.key || `f-${i}`}
                  rank={i + 1}
                  tier={confidenceTierFor(f.confidence)}
                  channel={f.evidence_metric?.channel_display || formatChannel(f.evidence_metric?.channel)}
                  hasEditorNote={!!f.ey_commentary}
                  headline={f.headline}
                  subCopy={f.narrative}
                  impactLabel="Opportunity"
                  impactValue={formatImpact(f.impact_dollars)}
                  suppressed={f.suppressed}
                  editorMode={editorMode}
                  onEditNote={() => onCommentaryEdit?.(f)}
                  onToggleSuppress={() => onSuppressToggle?.(f)}
                />
              ))}
            </MainColumn>

            <Sidebar>
              <EditorTakeCard data={data} />
              <ConfidenceCard findings={visibleFindings} />
            </Sidebar>
          </TwoColumn>
        )}

        {activeTab === "channels" && (
          <PlaceholderPane>
            Channel performance lives on its own screen now —{" "}
            <a href="?screen=channels" style={{ color: t.color.accent, fontWeight: 600 }}>
              open the Channels view
            </a>{" "}
            for response curves, saturation analysis, and campaign-level detail.
          </PlaceholderPane>
        )}

        {activeTab === "data" && (
          <DataAssumptionsPane data={data} />
        )}
      </BodyShell>
    </Main>
  );
}

// ─── Sub-components ───

/**
 * Editor's Take callout — shows analyst commentary on the top finding
 * if present, or a synthesized take if none. Per the mockup, this is
 * the most visually distinctive element in the sidebar and earns the
 * terracotta tint.
 */
function EditorTakeCard({ data }) {
  const findingWithCommentary = (data.findings || []).find((f) => f.ey_commentary);
  const analyst = data.analyst?.name || "Sarah Rahman";

  if (findingWithCommentary) {
    return (
      <Callout label="Editor's Take" byline={`${analyst}, reviewing analyst`}>
        {findingWithCommentary.ey_commentary.body || findingWithCommentary.ey_commentary}
      </Callout>
    );
  }

  // Fallback — synthesize from the top finding if no commentary exists.
  // In the real product an analyst would author this; for the pitch we
  // generate a reasonable default.
  const topFinding = data.findings?.[0];
  if (!topFinding) return null;
  return (
    <Callout label="Editor's Take" byline={`${analyst}, reviewing analyst`}>
      {topFinding.narrative}
    </Callout>
  );
}

/**
 * Confidence by Finding sidebar card — quick scan of which findings
 * are high-confidence vs directional vs inconclusive. Per mockup
 * Image 2 it uses the 3-segment ConfidenceBar beside each finding name.
 */
function ConfidenceCard({ findings }) {
  const rows = findings.slice(0, 5).map((f) => ({
    key: f.key,
    label: confidenceSidebarLabel(f),
    tier: confidenceTierFor(f.confidence),
  }));

  return (
    <SidebarCard>
      <SidebarLabel>Confidence by finding</SidebarLabel>
      <RowList>
        {rows.map((r) => (
          <ConfRow key={r.key}>
            <ConfLabel>{r.label}</ConfLabel>
            <ConfRight>
              <ConfidenceBar tier={r.tier} />
              <ConfTierText>{tierDisplayShort(r.tier)}</ConfTierText>
            </ConfRight>
          </ConfRow>
        ))}
      </RowList>
    </SidebarCard>
  );
}

function DataAssumptionsPane({ data }) {
  const cov = data.data_coverage || {};
  const method = data.methodology || [];
  return (
    <PageShell>
      <PaneSection>
        <PaneHead>Data coverage</PaneHead>
        <PaneList>
          {cov.total_spend && <li>Total spend analyzed: <strong>${formatMoneyPlain(cov.total_spend)}</strong></li>}
          {cov.total_revenue && <li>Attributable revenue: <strong>${formatMoneyPlain(cov.total_revenue)}</strong></li>}
          {cov.n_channels && <li>Channels included: <strong>{cov.n_channels}</strong></li>}
          {cov.n_campaigns && <li>Campaigns: <strong>{cov.n_campaigns}</strong></li>}
          {cov.period_rows && <li>Observations: <strong>{cov.period_rows.toLocaleString()}</strong></li>}
        </PaneList>
      </PaneSection>

      <PaneSection>
        <PaneHead>Methodology</PaneHead>
        <PaneList>
          {method.map((m, i) => (
            <li key={i}>
              <strong>{m.engine}:</strong> {m.method}
            </li>
          ))}
        </PaneList>
      </PaneSection>
    </PageShell>
  );
}

// ─── Helpers ───

function confidenceTierFor(conf) {
  if (!conf) return "directional";
  const lower = String(conf).toLowerCase();
  if (lower.startsWith("high")) return "high";
  if (lower.startsWith("inconclusive") || lower.startsWith("low")) return "inconclusive";
  return "directional";
}

function tierDisplayShort(tier) {
  if (tier === "high") return "High";
  if (tier === "directional") return "Dir.";
  return "Low";
}

function confidenceSidebarLabel(finding) {
  // Prefer a short channel-based label if available, else truncate headline
  const ch = finding.evidence_metric?.channel_display || finding.evidence_metric?.channel;
  if (ch) return ch.charAt(0).toUpperCase() + ch.slice(1).replaceAll("_", " ");
  const h = finding.headline || "";
  return h.length > 28 ? h.slice(0, 28) + "…" : h;
}

function formatChannel(ch) {
  if (!ch) return "";
  return ch.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatImpact(dollars) {
  if (dollars == null) return "—";
  const abs = Math.abs(dollars);
  const sign = dollars >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function formatMoneyPlain(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

function formatCoverageMeta(coverage) {
  if (!coverage) return null;
  const parts = [];
  if (coverage.n_channels) parts.push(`${coverage.n_channels} channels`);
  if (coverage.n_campaigns) parts.push(`${coverage.n_campaigns} campaigns`);
  return parts.join(" · ");
}

function formatToday() {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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

const FindingsHead = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${t.space[2]};
  margin-bottom: ${t.space[2]};
`;

const FindingsTitle = styled.h2`
  font-family: ${t.font.serif};
  font-size: ${t.size.xl};
  font-weight: ${t.weight.regular};
  color: ${t.color.ink};
  letter-spacing: ${t.tracking.tight};
  line-height: ${t.leading.snug};
  margin: 0;
`;

const FindingsMeta = styled.p`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink3};
  margin: 0;
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
  margin-bottom: ${t.space[3]};
`;

const RowList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${t.space[3]};
`;

const ConfRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${t.space[3]};
`;

const ConfLabel = styled.span`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink2};
  font-weight: ${t.weight.medium};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ConfRight = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${t.space[2]};
  flex-shrink: 0;
`;

const ConfTierText = styled.span`
  font-family: ${t.font.body};
  font-size: ${t.size.xs};
  color: ${t.color.ink2};
  font-weight: ${t.weight.semibold};
  min-width: 32px;
  text-align: right;
`;

const PlaceholderPane = styled.div`
  max-width: ${t.layout.readingWidth};
  margin: 0 auto;
  padding: ${t.space[10]} ${t.space[6]};
  background: ${t.color.surface};
  border: 1px dashed ${t.color.border};
  border-radius: ${t.radius.md};
  text-align: center;
  color: ${t.color.ink3};
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
`;

const PaneSection = styled.section`
  margin-bottom: ${t.space[8]};
`;

const PaneHead = styled.h3`
  font-family: ${t.font.body};
  font-size: ${t.size.xs};
  font-weight: ${t.weight.semibold};
  color: ${t.color.ink3};
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wider};
  margin: 0 0 ${t.space[3]} 0;
`;

const PaneList = styled.ul`
  list-style: disc;
  padding-left: ${t.space[5]};
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${t.space[2]};
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink};
  line-height: ${t.leading.relaxed};

  strong {
    font-weight: ${t.weight.semibold};
  }
`;
