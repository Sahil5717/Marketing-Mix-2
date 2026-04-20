import { useEffect, useState } from "react";
import styled from "styled-components";
import { t } from "./tokens.js";
import { AppHeader } from "./ui/AppHeader.jsx";

/**
 * ScenariosV2 — rebuilt to match v5 "preset + custom budget" mockup.
 *
 * Design pattern (per uploaded mockup):
 *   1. AppHeader (Scenarios tab active)
 *   2. Eyebrow + hero headline + reviewer line
 *   3. Helper text: "Pick a preset or set a custom total spend..."
 *   4. 4 preset tiles: Current Spend / Cut 20% / Increase 25% / Optimizer Recommended
 *   5. Custom Budget input row with "Run scenario" button
 *   6. Delta compare row: CURRENT PLAN → SELECTED SCENARIO = DELTA
 *   7. Channel comparison table at the selected scenario
 *   8. Bottom split: Open Plan + Open Market Context
 *
 * Data sources (reuses v24 endpoints — no backend changes needed):
 *   - GET /api/scenario/presets → { presets, current_spend }
 *   - GET /api/scenario?total_budget=X → full scenario (optimizer re-run)
 *
 * The legacy /api/v2/scenarios endpoint (fixed 3 scenarios) is NOT used
 * by this screen but remains available for backward compatibility.
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

const Eyebrow = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.accent};
  text-transform: uppercase;
  margin-bottom: 10px;
`;

const EyebrowSub = styled.span`
  color: ${t.color.ink3};
  font-weight: 500;
  margin-left: 8px;
`;

const Headline = styled.h1`
  font-family: ${t.fontV2.headline};
  font-size: 32px;
  font-weight: 600;
  line-height: 1.22;
  color: ${t.color.ink};
  margin: 0 0 12px 0;
  max-width: 940px;

  em {
    font-style: italic;
    color: ${t.color.accent};
  }
`;

const Reviewer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink2};
  margin-bottom: 24px;

  strong { color: ${t.color.ink}; font-weight: 600; }
`;

const Avatar = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${t.color.accent};
  color: white;
  font-weight: 600;
  font-size: 11px;
`;

const HelperText = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink2};
  line-height: 1.5;
  max-width: 720px;
  margin: 0 0 18px 0;
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const PresetTile = styled.button`
  display: flex;
  flex-direction: column;
  text-align: left;
  background: ${t.color.surface};
  border: ${({ $selected }) =>
    $selected ? `1.5px solid ${t.color.accent}` : `1px solid ${t.color.border}`};
  border-radius: ${t.radius.lg};
  padding: 16px 18px;
  cursor: pointer;
  transition: all ${t.motion.base} ${t.motion.ease};
  font-family: ${t.fontV2.body};

  &:hover {
    border-color: ${({ $selected }) => $selected ? t.color.accent : t.color.borderStrong};
  }
`;

const PresetEyebrow = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const PresetTitle = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  font-weight: 600;
  color: ${t.color.ink};
  margin-bottom: 4px;
`;

const PresetBudget = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 22px;
  font-weight: 600;
  color: ${t.color.ink};
  margin-bottom: 4px;
  line-height: 1.1;
`;

const PresetDescription = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11.5px;
  color: ${t.color.ink3};
  line-height: 1.4;
`;

const CustomRow = styled.div`
  display: grid;
  grid-template-columns: 140px auto 1fr auto;
  align-items: center;
  gap: 12px;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.lg};
  padding: 14px 18px;
  margin-bottom: 16px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr auto;
    grid-auto-rows: auto;
  }
`;

const CustomLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
`;

const DollarSign = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 16px;
  font-weight: 600;
  color: ${t.color.ink2};
`;

const BudgetInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const BudgetInput = styled.input`
  width: 90px;
  padding: 8px 10px;
  font-family: ${t.fontV2.body};
  font-size: 15px;
  font-weight: 500;
  color: ${t.color.ink};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.md};
  background: ${t.color.canvas};
  &:focus {
    outline: none;
    border-color: ${t.color.accent};
    background: ${t.color.surface};
  }
`;

const BudgetUnit = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink2};
`;

const RunBtn = styled.button`
  background: ${t.color.ink};
  color: ${t.color.inkInverse};
  padding: 10px 22px;
  border: 1px solid ${t.color.ink};
  border-radius: ${t.radius.md};
  font-family: ${t.fontV2.body};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const CompareRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 16px;
  align-items: center;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.lg};
  padding: 22px 28px;
  margin-bottom: 32px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr;
    gap: 10px;
    & > .arrow, & > .equals { display: none; }
  }
`;

const CompareCell = styled.div`
  display: flex;
  flex-direction: column;
`;

const CompareLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  text-transform: uppercase;
  color: ${t.color.ink3};
  margin-bottom: 6px;
`;

const CompareValue = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 30px;
  font-weight: 600;
  color: ${({ $tone }) =>
    $tone === "positive" ? t.color.positive :
    $tone === "negative" ? t.color.negative :
    t.color.ink};
  line-height: 1;
  margin-bottom: 6px;
`;

const CompareSub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11.5px;
  color: ${({ $tone }) =>
    $tone === "negative" ? t.color.negative :
    $tone === "positive" ? t.color.positive :
    t.color.ink3};
`;

const CompareSymbol = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 22px;
  color: ${t.color.ink3};
  font-weight: 400;
`;

const SplitRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

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
`;

const RelatedEyebrow = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
  margin-bottom: 10px;
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

const TableSectionHeader = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 20px;
  font-weight: 600;
  color: ${t.color.ink};
  margin: 20px 0 14px 0;
`;

// ─── Simple 2-column channel comparison table (current vs selected) ───────
const ScenarioTable = styled.div`
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  overflow: hidden;
  margin-bottom: 28px;
`;

const TableHead = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr 1.1fr 0.9fr 0.9fr;
  gap: 12px;
  padding: 12px 22px;
  background: ${t.color.sunken};
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;

  & > div:nth-child(n+2) { text-align: right; }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr 1.1fr 0.9fr 0.9fr;
  gap: 12px;
  padding: 12px 22px;
  border-top: 1px solid ${t.color.borderFaint};
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink};
  align-items: center;
  & > div:nth-child(n+2) { text-align: right; }

  &.total-row {
    background: ${t.color.sunken};
    font-weight: 700;
    border-top: 1px solid ${t.color.border};
  }
`;

const ChannelName = styled.div`
  font-weight: 600;
  color: ${t.color.ink};
`;

const DeltaCell = styled.div`
  color: ${({ $delta }) =>
    $delta > 0 ? t.color.positive :
    $delta < 0 ? t.color.negative :
    t.color.ink3};
  font-weight: ${({ $delta }) => ($delta !== 0 ? 600 : 400)};
`;

function fmtM(v) {
  if (v == null) return "—";
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtMSigned(v) {
  if (v == null) return "—";
  const n = Number(v) || 0;
  const sign = n >= 0 ? "+" : "−";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export default function ScenariosV2({ onNavigate }) {
  const [presets, setPresets] = useState(null);
  const [currentSpend, setCurrentSpend] = useState(null);
  const [selectedKey, setSelectedKey] = useState("baseline");
  const [customBudgetM, setCustomBudgetM] = useState("");
  const [scenario, setScenario] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);

  const go = (screen, params = {}) => {
    if (onNavigate) onNavigate(screen, params);
    else {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", screen);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
      window.location.href = url.toString();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const pRes = await fetch("/api/scenario/presets");
        if (!pRes.ok) throw new Error(`presets HTTP ${pRes.status}`);
        const pData = await pRes.json();
        setPresets(pData.presets || []);
        setCurrentSpend(pData.current_spend || null);
        setCustomBudgetM(((pData.current_spend || 0) / 1e6).toFixed(1));

        const bRes = await fetch("/api/scenario");
        if (!bRes.ok) throw new Error(`baseline HTTP ${bRes.status}`);
        const bData = await bRes.json();
        setBaseline(bData);
        setScenario(bData);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function selectPreset(preset) {
    setSelectedKey(preset.key);
    setCustomBudgetM((preset.total_budget / 1e6).toFixed(1));
    setRunning(true);
    try {
      const r = await fetch(`/api/scenario?total_budget=${preset.total_budget}`);
      if (!r.ok) throw new Error(`scenario HTTP ${r.status}`);
      setScenario(await r.json());
    } catch (e) {
      setErr(String(e));
    } finally {
      setRunning(false);
    }
  }

  async function runCustom() {
    const mNum = parseFloat(customBudgetM);
    if (!mNum || mNum <= 0) {
      alert("Enter a positive budget in millions");
      return;
    }
    setSelectedKey("custom");
    setRunning(true);
    try {
      const totalBudget = mNum * 1e6;
      const r = await fetch(`/api/scenario?total_budget=${totalBudget}`);
      if (!r.ok) throw new Error(`scenario HTTP ${r.status}`);
      setScenario(await r.json());
    } catch (e) {
      setErr(String(e));
    } finally {
      setRunning(false);
    }
  }

  const ACRONYMS = { tv: "TV", ooh: "OOH", ctv: "CTV", ott: "OTT", ai: "AI" };
  function prettyChannel(raw) {
    if (!raw) return "Unknown";
    return String(raw)
      .split("_")
      .map((w) => ACRONYMS[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function channelRowsFromScenario(sc) {
    if (!sc || !sc.moves) return [];
    return sc.moves.map((m) => {
      const curSp = m.current_spend || 0;
      const optSp = m.optimized_spend || 0;
      return {
        channel: prettyChannel(m.channel),
        current_spend: curSp,
        recommended_spend: optSp,
        delta_spend: optSp - curSp,
        delta_pct: m.change_pct || 0,
        revenue_delta: m.revenue_delta || 0,
        confidence: m.reliability || "directional",
        pillar: optSp > curSp ? "revenue_uplift" : (optSp < curSp ? "cost_reduction" : "cx_uplift"),
      };
    });
  }

  if (err) {
    return (
      <Canvas>
        <AppHeader currentScreen="scenarios" v2Mode />
        <Page>
          <ErrorPane>
            Could not load scenarios: {err}. Make sure the backend is running and
            you've hit <code>/api/load-mock-data</code> and <code>/api/run-analysis</code>.
          </ErrorPane>
        </Page>
      </Canvas>
    );
  }

  if (loading || !presets || !baseline) {
    return (
      <Canvas>
        <AppHeader currentScreen="scenarios" v2Mode />
        <Page>
          <LoadingPane>Loading Scenarios…</LoadingPane>
        </Page>
      </Canvas>
    );
  }

  const baselineBudget = baseline?.comparison?.baseline?.total_budget || currentSpend || 0;
  const baselineRevenue = baseline?.comparison?.baseline?.projected_revenue || 0;
  const baselineRoas = baselineRevenue / Math.max(baselineBudget, 1);

  const scenarioBudget = scenario?.comparison?.scenario?.total_budget || baselineBudget;
  const scenarioRevenue = scenario?.comparison?.scenario?.projected_revenue || baselineRevenue;
  const scenarioRoas = scenarioRevenue / Math.max(scenarioBudget, 1);

  const deltaRevenue = scenarioRevenue - baselineRevenue;
  const deltaTone = deltaRevenue > 0 ? "positive" : deltaRevenue < 0 ? "negative" : null;
  const deltaLabel =
    deltaRevenue > 0
      ? "Higher revenue at this spend"
      : deltaRevenue < 0
      ? (scenarioBudget < baselineBudget ? "Less spend, less revenue" : "Same spend, less revenue")
      : "No revenue change";

  const comparisonRows = channelRowsFromScenario(scenario);
  const totalRow = {
    current_spend: comparisonRows.reduce((s, r) => s + r.current_spend, 0),
    recommended_spend: comparisonRows.reduce((s, r) => s + r.recommended_spend, 0),
    delta_spend: comparisonRows.reduce((s, r) => s + r.delta_spend, 0),
    revenue_delta: comparisonRows.reduce((s, r) => s + r.revenue_delta, 0),
  };

  return (
    <Canvas>
      <AppHeader
        currentScreen="scenarios"
        v2Mode
        engagementMeta={{ client: "Acme Retail", period: "Q3 2026" }}
      />
      <Page>
        <Eyebrow>
          Scenarios
          <EyebrowSub>· what-if budget exploration</EyebrowSub>
        </Eyebrow>
        <Headline>
          Test alternative budgets <em>side-by-side</em> against the current plan.
        </Headline>
        <Reviewer>
          <Avatar>SR</Avatar>
          <span>
            Reviewed by <strong>Sarah Rahman</strong>, Senior Manager · optimizer re-runs on selection
          </span>
        </Reviewer>

        <HelperText>
          Pick a preset or set a custom total spend. The optimizer re-runs the allocation and shows
          projected outcomes compared to the current plan.
        </HelperText>

        <PresetGrid>
          {presets.map((p) => (
            <PresetTile
              key={p.key}
              $selected={selectedKey === p.key}
              onClick={() => selectPreset(p)}
              disabled={running}
            >
              <PresetEyebrow>Preset · {p.label.toUpperCase()}</PresetEyebrow>
              <PresetTitle>
                {p.key === "baseline"     && "Current plan"}
                {p.key === "conservative" && "Cut total spend"}
                {p.key === "growth"       && "Increase budget"}
                {p.key === "recommended"  && "Hold total, reallocate"}
              </PresetTitle>
              <PresetBudget>{fmtM(p.total_budget)}</PresetBudget>
              <PresetDescription>
                {p.key === "baseline"     && "Today's allocation, no changes"}
                {p.key === "conservative" && "Tighten spend; preserve highest-ROI channels"}
                {p.key === "growth"       && "Test headroom at higher spend"}
                {p.key === "recommended"  && "Recommended"}
              </PresetDescription>
            </PresetTile>
          ))}
        </PresetGrid>

        <CustomRow>
          <CustomLabel>Custom Budget</CustomLabel>
          <DollarSign>$</DollarSign>
          <BudgetInputWrap>
            <BudgetInput
              type="number"
              step="0.1"
              min="0"
              value={customBudgetM}
              onChange={(e) => setCustomBudgetM(e.target.value)}
              disabled={running}
            />
            <BudgetUnit>million / year</BudgetUnit>
          </BudgetInputWrap>
          <RunBtn onClick={runCustom} disabled={running}>
            {running ? "Running…" : "Run scenario"}
          </RunBtn>
        </CustomRow>

        <CompareRow>
          <CompareCell>
            <CompareLabel>Current plan</CompareLabel>
            <CompareValue>{fmtM(baselineBudget)}</CompareValue>
            <CompareSub>
              Revenue: {fmtM(baselineRevenue)} · ROAS: {baselineRoas.toFixed(2)}×
            </CompareSub>
          </CompareCell>
          <CompareSymbol className="arrow">→</CompareSymbol>
          <CompareCell>
            <CompareLabel>Selected scenario</CompareLabel>
            <CompareValue>{fmtM(scenarioBudget)}</CompareValue>
            <CompareSub>
              Revenue: {fmtM(scenarioRevenue)} · ROAS: {scenarioRoas.toFixed(2)}×
            </CompareSub>
          </CompareCell>
          <CompareSymbol className="equals">=</CompareSymbol>
          <CompareCell>
            <CompareLabel>Delta</CompareLabel>
            <CompareValue $tone={deltaTone}>{fmtMSigned(deltaRevenue)}</CompareValue>
            <CompareSub $tone={deltaTone}>{deltaLabel}</CompareSub>
          </CompareCell>
        </CompareRow>

        {comparisonRows.length > 0 && (
          <>
            <TableSectionHeader>Channel allocation at selected scenario</TableSectionHeader>
            <ScenarioTable>
              <TableHead>
                <div>Channel</div>
                <div>Current</div>
                <div>Selected</div>
                <div>Δ Spend</div>
                <div>Δ %</div>
                <div>Δ Revenue</div>
              </TableHead>
              {comparisonRows
                .slice()
                .sort((a, b) => Math.abs(b.delta_spend) - Math.abs(a.delta_spend))
                .map((row) => (
                  <TableRow key={row.channel}>
                    <ChannelName>{row.channel}</ChannelName>
                    <div>{fmtM(row.current_spend)}</div>
                    <div>{fmtM(row.recommended_spend)}</div>
                    <DeltaCell $delta={row.delta_spend}>
                      {row.delta_spend === 0 ? "—" : fmtMSigned(row.delta_spend)}
                    </DeltaCell>
                    <DeltaCell $delta={row.delta_pct}>
                      {row.delta_pct === 0
                        ? "—"
                        : `${row.delta_pct > 0 ? "+" : ""}${row.delta_pct.toFixed(0)}%`}
                    </DeltaCell>
                    <DeltaCell $delta={row.revenue_delta}>
                      {row.revenue_delta === 0 ? "—" : fmtMSigned(row.revenue_delta)}
                    </DeltaCell>
                  </TableRow>
                ))}
              <TableRow className="total-row">
                <ChannelName>Total</ChannelName>
                <div>{fmtM(totalRow.current_spend)}</div>
                <div>{fmtM(totalRow.recommended_spend)}</div>
                <DeltaCell $delta={totalRow.delta_spend}>
                  {fmtMSigned(totalRow.delta_spend)}
                </DeltaCell>
                <div>—</div>
                <DeltaCell $delta={totalRow.revenue_delta}>
                  {fmtMSigned(totalRow.revenue_delta)}
                </DeltaCell>
              </TableRow>
            </ScenarioTable>
          </>
        )}

        <SplitRow>
          <RelatedTile>
            <RelatedLink onClick={() => go("plan")}>Open Plan</RelatedLink>
            <RelatedEyebrow>Where scenarios commit</RelatedEyebrow>
            <RelatedHeadline>Apply a scenario to the Plan</RelatedHeadline>
            <RelatedBody>
              When you commit a scenario, the Plan screen locks the selected allocation
              and the moves flow into the execution calendar.
            </RelatedBody>
          </RelatedTile>
          <RelatedTile>
            <RelatedLink onClick={() => go("market")}>Open Market Context</RelatedLink>
            <RelatedEyebrow>Why outcomes differ</RelatedEyebrow>
            <RelatedHeadline>Scenarios already include market signals</RelatedHeadline>
            <RelatedBody>
              Events, cost trends, and competitive pressure flow through every scenario's
              optimizer run. You are seeing projections net of market conditions.
            </RelatedBody>
          </RelatedTile>
        </SplitRow>
      </Page>
    </Canvas>
  );
}
