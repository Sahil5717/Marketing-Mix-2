import { useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { t } from "../tokens.js";
import { fetchChannelDeepDive } from "../api.js";
import { KpiHero } from "../ui/KpiHero.jsx";

/**
 * ChannelDetail — redesigned per UX handoff + mockup Image 5.
 *
 * New screen in v18h. Per-channel drill-down with:
 *   - Breadcrumb (All channels › Paid Search)
 *   - Large serif channel name + metadata line + channel picker dropdown
 *   - KPI row: Current Spend / Attributed Revenue / Channel ROAS / Confidence
 *     (all four equal weight — no primary/dark card per handoff §4.5)
 *   - Saturation curve (Recharts): response curve with current-spend
 *     marker (terracotta) and optimal-spend marker (green), shaded
 *     "past saturation" region
 *   - Campaigns table: Campaign / Spend / Revenue / ROAS / Trend /
 *     Recommendation
 *
 * Accepts `initialData = { deepDive, channels }` from the shell's
 * ensureChannelDetailReady() call. On picker change, fetches a fresh
 * deep-dive and swaps the payload in place (no full screen reload).
 */
export function ChannelDetail({ data: initialData }) {
  const [deepDive, setDeepDive] = useState(initialData?.deepDive);
  const [channels] = useState(initialData?.channels || []);
  const [loading, setLoading] = useState(false);

  const handlePickerChange = useCallback(async (ev) => {
    const slug = ev.target.value;
    if (!slug || slug === deepDive?.channel) return;
    setLoading(true);
    // Update the URL so refreshes land on the same channel. We're still
    // using ?screen= URL params for routing; add a `channel` param.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("channel", slug);
      window.history.replaceState(null, "", url.toString());
    }
    const { data, error } = await fetchChannelDeepDive(slug);
    setLoading(false);
    if (data) setDeepDive(data);
    else console.warn("Channel fetch failed", error);
  }, [deepDive]);

  if (!deepDive) return null;

  const stats = deepDive.summary_stats || {};
  const curve = deepDive.response_curve || {};
  const optimization = deepDive.optimization;
  const campaigns = deepDive.campaigns || [];

  return (
    <Main>
      <HeaderShell>
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbItem href="?screen=diagnosis">All channels</BreadcrumbItem>
          <BreadcrumbSep>›</BreadcrumbSep>
          <BreadcrumbCurrent>{deepDive.channel_display}</BreadcrumbCurrent>
        </Breadcrumb>

        {/* Channel name + picker row */}
        <NameRow>
          <div>
            <ChannelName>{deepDive.channel_display}</ChannelName>
            <MetaLine>
              {stats.current_spend ? `${campaigns.length || 0} active campaigns` : ""}
              {stats.current_spend && " · "}
              Last updated {todayFormatted()}
            </MetaLine>
          </div>

          {channels.length > 1 && (
            <PickerWrap>
              <PickerLabel>Switch channel</PickerLabel>
              <Picker
                value={deepDive.channel}
                onChange={handlePickerChange}
                disabled={loading}
              >
                {channels.map((c) => (
                  <option key={c.channel} value={c.channel}>
                    {c.channel_display}
                  </option>
                ))}
              </Picker>
            </PickerWrap>
          )}
        </NameRow>

        {/* KPI row — 4 cards, equal weight per handoff §4.5 */}
        <KpiRow>
          <KpiHero
            label="Current spend"
            value={formatMoneyDisplay(stats.current_spend).replace(/^\$|M$/g, "")}
            unit={moneyUnit(stats.current_spend)}
            context={trendContext(deepDive.monthly_trend, "spend")}
          />
          <KpiHero
            label="Revenue (attributed)"
            value={formatMoneyDisplay(stats.attributed_revenue).replace(/^\$|M$/g, "")}
            unit={moneyUnit(stats.attributed_revenue)}
            context={trendContext(deepDive.monthly_trend, "revenue")}
          />
          <KpiHero
            label="Channel ROAS"
            value={stats.channel_roas != null ? stats.channel_roas.toFixed(1) : "—"}
            unit="×"
            context={roasContext(stats.channel_roas)}
          />
          <KpiHero
            label="Confidence"
            value={stats.confidence_tier || "—"}
            confidence={tierFromLabel(stats.confidence_tier)}
            context={curve.diagnostics?.r_squared
              ? `R² = ${curve.diagnostics.r_squared}`
              : undefined}
          />
        </KpiRow>
      </HeaderShell>

      {/* Saturation curve section */}
      <Section>
        <SectionHead>
          <SectionTitle>Saturation curve</SectionTitle>
          <SectionCopy>
            Incremental revenue at each spend level. The channel's efficient
            frontier is the point where marginal returns begin to compress —
            each additional dollar after that returns less than the previous.
          </SectionCopy>
        </SectionHead>

        <CurveCard>
          <SaturationChart
            curve={curve}
            optimization={optimization}
          />
          <Legend2>
            <LegendItem>
              <LegendLine $color={t.color.ink} />
              <span>Response curve</span>
            </LegendItem>
            {optimization && (
              <LegendItem>
                <LegendDot $color={t.color.positive} />
                <span>Optimal: {formatMoneyDisplay(optimization.optimal_spend)}</span>
              </LegendItem>
            )}
            {optimization && (
              <LegendItem>
                <LegendDot $color={t.color.accent} />
                <span>Current: {formatMoneyDisplay(optimization.current_spend)}</span>
              </LegendItem>
            )}
          </Legend2>
        </CurveCard>
      </Section>

      {/* Campaigns table */}
      {campaigns.length > 0 && (
        <Section>
          <SectionHead>
            <SectionTitle>Campaigns in this channel</SectionTitle>
            <SectionCopy>
              Campaign-level breakdown. Rows are sorted by spend.
              Recommendations come from the channel-level moves.
            </SectionCopy>
          </SectionHead>

          <TableCard>
            <Table>
              <thead>
                <tr>
                  <Th $align="left">Campaign</Th>
                  <Th $align="right">Spend</Th>
                  <Th $align="right">Revenue</Th>
                  <Th $align="right">ROAS</Th>
                  <Th $align="right">Conversions</Th>
                  <Th $align="left">Recommendation</Th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.campaign + i}>
                    <Td $align="left">
                      <strong>{c.campaign}</strong>
                    </Td>
                    <Td $align="right" className="tabular">{formatMoneyDisplay(c.spend)}</Td>
                    <Td $align="right" className="tabular">{formatMoneyDisplay(c.revenue)}</Td>
                    <Td $align="right" className="tabular">
                      <RoasCell $roas={c.roas}>{c.roas.toFixed(2)}×</RoasCell>
                    </Td>
                    <Td $align="right" className="tabular">{c.conversions.toLocaleString()}</Td>
                    <Td $align="left" $muted>
                      {optimization?.action === "increase" ? "Scale" :
                       optimization?.action === "decrease" ? "Reduce" : "Hold"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableCard>
        </Section>
      )}

      {loading && <LoadingOverlay>Loading channel…</LoadingOverlay>}
    </Main>
  );
}

// ─── Saturation chart ───

/**
 * SaturationChart — the response curve visualization.
 *
 * Per mockup Image 5:
 *   - Smooth black curve (response_curve.curve_points)
 *   - Terracotta dot + vertical dashed line at current_spend
 *   - Green dot + vertical dashed line at optimal_spend
 *   - Shaded region (accent-tinted) right of the saturation point,
 *     labeled "Past saturation"
 *   - X axis in $M, Y axis in $M, no gridlines (too busy for the
 *     mockup's minimal aesthetic)
 */
function SaturationChart({ curve, optimization }) {
  const points = curve.curve_points || [];
  const saturation = curve.saturation_spend;
  const currentSpend = optimization?.current_spend;
  const optimalSpend = optimization?.optimal_spend;

  // Convert points to $M units so axes read cleanly
  const chartData = useMemo(
    () => points.map((p) => ({
      spend: p.spend / 1e6,
      revenue: p.revenue / 1e6,
    })),
    [points]
  );

  if (chartData.length === 0) {
    return (
      <ChartEmpty>
        Response curve not available for this channel.
      </ChartEmpty>
    );
  }

  const maxSpend = chartData[chartData.length - 1]?.spend || 1;
  const saturationM = saturation ? saturation / 1e6 : null;
  const currentM = currentSpend ? currentSpend / 1e6 : null;
  const optimalM = optimalSpend ? optimalSpend / 1e6 : null;

  // Revenue value at the current and optimal spend (for the dot Y-coordinates).
  // Find the closest curve point to the requested x-coordinate.
  const nearestRevenue = (x) => {
    if (x == null) return null;
    let best = chartData[0];
    let bestDist = Math.abs(best.spend - x);
    for (const p of chartData) {
      const d = Math.abs(p.spend - x);
      if (d < bestDist) { best = p; bestDist = d; }
    }
    return best.revenue;
  };
  const currentRev = nearestRevenue(currentM);
  const optimalRev = nearestRevenue(optimalM);

  return (
    <ChartWrap>
      <ResponsiveContainer width="100%" height={360}>
        <AreaChart
          data={chartData}
          margin={{ top: 24, right: 32, left: 8, bottom: 24 }}
        >
          <CartesianGrid
            vertical={false}
            stroke={t.color.borderFaint}
          />
          <XAxis
            dataKey="spend"
            type="number"
            domain={[0, maxSpend]}
            tickFormatter={(v) => `$${v.toFixed(0)}M`}
            stroke={t.color.ink3}
            tick={{ fill: t.color.ink3, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: t.color.borderFaint }}
            label={{
              value: "Spend",
              position: "insideBottom",
              offset: -8,
              style: { fill: t.color.ink3, fontSize: 11, fontWeight: 600 },
            }}
          />
          <YAxis
            tickFormatter={(v) => `$${v.toFixed(0)}M`}
            stroke={t.color.ink3}
            tick={{ fill: t.color.ink3, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: t.color.borderFaint }}
            label={{
              value: "Revenue",
              angle: -90,
              position: "insideLeft",
              style: { fill: t.color.ink3, fontSize: 11, fontWeight: 600 },
            }}
          />
          <Tooltip
            contentStyle={{
              background: t.color.surface,
              border: `1px solid ${t.color.border}`,
              borderRadius: 6,
              fontSize: 12,
              fontFamily: t.font.body,
            }}
            formatter={(v, n) => [
              `$${v.toFixed(2)}M`,
              n === "revenue" ? "Revenue" : n,
            ]}
            labelFormatter={(v) => `Spend: $${Number(v).toFixed(2)}M`}
          />

          {/* Past-saturation shaded region */}
          {saturationM && maxSpend > saturationM && (
            <ReferenceArea
              x1={saturationM}
              x2={maxSpend}
              fill={t.color.accent}
              fillOpacity={0.06}
              stroke="none"
            />
          )}

          {/* The response curve itself — area under curve for visual anchor */}
          <defs>
            <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.color.ink} stopOpacity={0.08} />
              <stop offset="100%" stopColor={t.color.ink} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={t.color.ink}
            strokeWidth={2}
            fill="url(#curveFill)"
            dot={false}
            isAnimationActive={false}
          />

          {/* Vertical reference lines at current and optimal */}
          {currentM != null && (
            <ReferenceLine
              x={currentM}
              stroke={t.color.accent}
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />
          )}
          {optimalM != null && (
            <ReferenceLine
              x={optimalM}
              stroke={t.color.positive}
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />
          )}

          {/* Markers — the terracotta and green dots.
              Each dot carries an inline label above it showing the
              spend → revenue pair so the user reads the values
              without needing to hover. Position depends on which
              side of the chart the dot sits on so labels don't clip. */}
          {currentM != null && currentRev != null && (
            <ReferenceDot
              x={currentM}
              y={currentRev}
              r={6}
              fill={t.color.accent}
              stroke={t.color.surface}
              strokeWidth={2}
              ifOverflow="extendDomain"
              label={{
                value: `Current $${currentM.toFixed(1)}M → $${currentRev.toFixed(1)}M`,
                position: currentM < maxSpend * 0.5 ? "right" : "left",
                offset: 12,
                fill: t.color.accent,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: t.font.body,
              }}
            />
          )}
          {optimalM != null && optimalRev != null && (
            <ReferenceDot
              x={optimalM}
              y={optimalRev}
              r={6}
              fill={t.color.positive}
              stroke={t.color.surface}
              strokeWidth={2}
              ifOverflow="extendDomain"
              label={{
                value: `Optimal $${optimalM.toFixed(1)}M → $${optimalRev.toFixed(1)}M`,
                position: optimalM < maxSpend * 0.5 ? "right" : "left",
                offset: 12,
                fill: t.color.positive,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: t.font.body,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Past-saturation label — absolutely positioned because Recharts
          doesn't cleanly support diagonal labels in reference areas */}
      {saturationM && maxSpend > saturationM * 1.1 && (
        <PastSaturationLabel
          style={{
            left: `${(saturationM / maxSpend) * 80 + 10}%`,
          }}
        >
          Past saturation
        </PastSaturationLabel>
      )}
    </ChartWrap>
  );
}

// ─── Helpers ───

function formatMoneyDisplay(n) {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function moneyUnit(n) {
  if (n == null) return "";
  if (Math.abs(n) >= 1e9) return "B";
  if (Math.abs(n) >= 1e6) return "M";
  if (Math.abs(n) >= 1e3) return "K";
  return "";
}

function tierFromLabel(label) {
  if (!label) return undefined;
  const l = String(label).toLowerCase();
  if (l.startsWith("high")) return "high";
  if (l.startsWith("inconclusive") || l.startsWith("low")) return "inconclusive";
  return "directional";
}

function trendContext(monthlyTrend, field) {
  // Compute last-year vs prior-year delta for the KPI context line.
  // Rough and cheerful — we don't need exact YoY semantics, just
  // directional.
  if (!monthlyTrend || monthlyTrend.length < 24) return "Last 12 months";
  const recent = monthlyTrend.slice(-12).reduce((s, r) => s + (r[field] || 0), 0);
  const prior = monthlyTrend.slice(-24, -12).reduce((s, r) => s + (r[field] || 0), 0);
  if (prior === 0) return "Last 12 months";
  const pct = ((recent - prior) / prior) * 100;
  if (Math.abs(pct) < 1) return "Flat vs last year";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% vs last year`;
}

function roasContext(roas) {
  if (roas == null) return "";
  // Context against rough benchmarks — retail ~2.5x, B2B ~3.0x
  if (roas >= 3.5) return "Above portfolio median";
  if (roas >= 2.0) return "Within typical range";
  return "Below portfolio median";
}

function todayFormatted() {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Styled ───

const Main = styled.main`
  min-height: 100vh;
  background: ${t.color.canvas};
  animation: mlFadeIn ${t.motion.slow} ${t.motion.ease};
  position: relative;
`;

const HeaderShell = styled.section`
  max-width: ${t.layout.maxWidth};
  margin: 0 auto;
  padding: ${t.space[8]} ${t.layout.pad.wide} ${t.space[6]};
  display: flex;
  flex-direction: column;
  gap: ${t.space[5]};

  @media (max-width: ${t.layout.bp.wide}) {
    padding-left: ${t.layout.pad.narrow};
    padding-right: ${t.layout.pad.narrow};
  }
`;

const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: ${t.space[2]};
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink3};
`;

const BreadcrumbItem = styled.a`
  color: ${t.color.ink3};
  text-decoration: none;

  &:hover {
    color: ${t.color.accent};
  }
`;

const BreadcrumbSep = styled.span`
  color: ${t.color.ink4};
`;

const BreadcrumbCurrent = styled.span`
  color: ${t.color.ink};
  font-weight: ${t.weight.medium};
`;

const NameRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${t.space[6]};
  flex-wrap: wrap;
`;

const ChannelName = styled.h1`
  font-family: ${t.font.serif};
  font-size: clamp(36px, 4.5vw, 56px);
  font-weight: ${t.weight.regular};
  line-height: 1.05;
  letter-spacing: ${t.tracking.tightest};
  color: ${t.color.ink};
  margin: 0;
`;

const MetaLine = styled.p`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink3};
  margin: ${t.space[1]} 0 0 0;
`;

const PickerWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${t.space[1]};
  min-width: 200px;
`;

const PickerLabel = styled.label`
  font-family: ${t.font.body};
  font-size: ${t.size.xs};
  font-weight: ${t.weight.semibold};
  color: ${t.color.ink3};
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wider};
`;

const Picker = styled.select`
  padding: ${t.space[2]} ${t.space[3]};
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.sm};
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  font-weight: ${t.weight.medium};
  color: ${t.color.ink};
  cursor: pointer;

  &:focus {
    border-color: ${t.color.accent};
    outline: none;
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${t.space[3]};

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Section = styled.section`
  max-width: ${t.layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${t.layout.pad.wide} ${t.space[10]};

  @media (max-width: ${t.layout.bp.wide}) {
    padding-left: ${t.layout.pad.narrow};
    padding-right: ${t.layout.pad.narrow};
  }
`;

const SectionHead = styled.header`
  margin-bottom: ${t.space[4]};
  display: flex;
  flex-direction: column;
  gap: ${t.space[2]};
`;

const SectionTitle = styled.h2`
  font-family: ${t.font.serif};
  font-size: ${t.size.xl};
  font-weight: ${t.weight.regular};
  letter-spacing: ${t.tracking.tight};
  color: ${t.color.ink};
  margin: 0;
`;

const SectionCopy = styled.p`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink3};
  line-height: ${t.leading.relaxed};
  margin: 0;
  max-width: 680px;
`;

const CurveCard = styled.div`
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.lg};
  padding: ${t.space[6]} ${t.space[5]} ${t.space[4]};
  box-shadow: ${t.shadow.card};
`;

const ChartWrap = styled.div`
  position: relative;
  width: 100%;
`;

const ChartEmpty = styled.div`
  padding: ${t.space[16]} ${t.space[6]};
  text-align: center;
  color: ${t.color.ink3};
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
`;

const PastSaturationLabel = styled.span`
  position: absolute;
  top: ${t.space[5]};
  font-family: ${t.font.serif};
  font-style: italic;
  font-size: ${t.size.md};
  color: ${t.color.accent};
  opacity: 0.7;
  pointer-events: none;
`;

const Legend2 = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${t.space[5]};
  margin-top: ${t.space[3]};
  padding-top: ${t.space[3]};
  border-top: 1px solid ${t.color.borderFaint};
  font-family: ${t.font.body};
  font-size: ${t.size.xs};
  color: ${t.color.ink2};
`;

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${t.space[2]};
`;

const LegendLine = styled.span`
  width: 18px;
  height: 2px;
  background: ${({ $color }) => $color};
  border-radius: 1px;
`;

const LegendDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const TableCard = styled.div`
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.md};
  box-shadow: ${t.shadow.card};
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
`;

const Th = styled.th`
  text-align: ${({ $align }) => $align || "left"};
  padding: ${t.space[3]} ${t.space[4]};
  background: ${t.color.sunken};
  border-bottom: 1px solid ${t.color.border};
  font-weight: ${t.weight.semibold};
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wider};
  font-size: ${t.size.xs};
  color: ${t.color.ink3};
`;

const Td = styled.td`
  text-align: ${({ $align }) => $align || "left"};
  padding: ${t.space[3]} ${t.space[4]};
  border-bottom: 1px solid ${t.color.borderFaint};
  color: ${({ $muted }) => ($muted ? t.color.ink2 : t.color.ink)};

  tbody tr:last-child & {
    border-bottom: none;
  }

  strong {
    font-weight: ${t.weight.semibold};
  }
`;

const RoasCell = styled.span`
  font-weight: ${t.weight.semibold};
  color: ${({ $roas }) =>
    $roas >= 3 ? t.color.positive :
    $roas >= 2 ? t.color.ink :
    t.color.warning};
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: calc(${t.layout.headerHeight} + ${t.space[4]});
  right: ${t.space[4]};
  padding: ${t.space[2]} ${t.space[4]};
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.sm};
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink2};
  box-shadow: ${t.shadow.raised};
  z-index: ${t.z.sticky + 5};
`;
