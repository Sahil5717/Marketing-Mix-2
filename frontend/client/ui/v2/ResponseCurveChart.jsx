import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * ResponseCurveChart — SVG chart for the Channel Detail screen.
 *
 * Renders:
 *   - X axis: spend (annualized)
 *   - Y axis: revenue (predicted from response curve)
 *   - Shaded 90% HDI band (light amber)
 *   - Mean curve line (amber)
 *   - Current spend vertical marker (red, with "CURRENT" label)
 *   - Recommended spend vertical marker (green, with "RECOMMENDED" label)
 *   - Dashed "efficient frontier" annotation
 *
 * Uses native SVG only — no recharts, keeps the v2 bundle small and
 * the chart fully stylable via tokens.
 *
 * Props:
 *   data — /api/v2/channel response_curve:
 *     { points: [{spend, revenue, revenue_low, revenue_high}],
 *       current_spend, current_revenue,
 *       recommended_spend, recommended_revenue,
 *       efficient_frontier_spend,
 *       model_r2, hdi_pct,
 *       marginal_roas_current, marginal_roas_recommended }
 */

const ChartWrap = styled.div`
  width: 100%;
  margin: 10px 0 4px;
`;

const Svg = styled.svg`
  width: 100%;
  height: 300px;
  display: block;
  font-family: ${t.fontV2.body};
`;

// Chart geometry (viewBox coordinates)
const VB_W = 700;
const VB_H = 300;
const PAD_LEFT = 55;
const PAD_RIGHT = 20;
const PAD_TOP = 30;
const PAD_BOTTOM = 45;
const PLOT_W = VB_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VB_H - PAD_TOP - PAD_BOTTOM;

function formatM(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

export function ResponseCurveChart({ data }) {
  if (!data || !data.points || data.points.length < 2) {
    return (
      <ChartWrap>
        <div style={{
          padding: "40px",
          textAlign: "center",
          color: t.color.ink3,
          fontFamily: t.fontV2.body,
          fontSize: 13,
        }}>
          Response curve not available for this channel.
        </div>
      </ChartWrap>
    );
  }

  const { points, current_spend, recommended_spend, efficient_frontier_spend } = data;

  const maxSpend = Math.max(...points.map((p) => p.spend));
  const maxRevenue = Math.max(...points.map((p) => p.revenue_high));

  const xFor = (spend) => PAD_LEFT + (spend / maxSpend) * PLOT_W;
  const yFor = (rev) => PAD_TOP + PLOT_H - (rev / maxRevenue) * PLOT_H;

  // HDI band: outline from low to high
  const bandTop = points.map((p) => `${xFor(p.spend)},${yFor(p.revenue_high)}`).join(" ");
  const bandBottom = points
    .slice()
    .reverse()
    .map((p) => `${xFor(p.spend)},${yFor(p.revenue_low)}`)
    .join(" ");
  const bandPath = `M ${points.map((p) => `${xFor(p.spend)},${yFor(p.revenue_high)}`).join(" L ")} L ${points
    .slice()
    .reverse()
    .map((p) => `${xFor(p.spend)},${yFor(p.revenue_low)}`)
    .join(" L ")} Z`;

  // Mean curve
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.spend)},${yFor(p.revenue)}`).join(" ");

  // Axis ticks
  const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) => ({
    x: xFor(maxSpend * f),
    label: formatM(maxSpend * f),
  }));
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) => ({
    y: yFor(maxRevenue * f),
    label: formatM(maxRevenue * f),
  }));

  // Find the y values at current and recommended for marker placement
  const currentPoint = points.reduce((best, p) =>
    Math.abs(p.spend - current_spend) < Math.abs(best.spend - current_spend) ? p : best
  );
  const recommendedPoint = points.reduce((best, p) =>
    Math.abs(p.spend - recommended_spend) < Math.abs(best.spend - recommended_spend) ? p : best
  );

  const recSpendDiffers = Math.abs(recommended_spend - current_spend) > maxSpend * 0.02;

  return (
    <ChartWrap>
      <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {yTicks.slice(1, -1).map((tick, i) => (
          <line
            key={`grid-y-${i}`}
            x1={PAD_LEFT}
            y1={tick.y}
            x2={VB_W - PAD_RIGHT}
            y2={tick.y}
            stroke={t.color.borderFaint}
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        ))}

        {/* Axes */}
        <line
          x1={PAD_LEFT}
          y1={VB_H - PAD_BOTTOM}
          x2={VB_W - PAD_RIGHT}
          y2={VB_H - PAD_BOTTOM}
          stroke={t.color.border}
          strokeWidth="1"
        />
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={VB_H - PAD_BOTTOM}
          stroke={t.color.border}
          strokeWidth="1"
        />

        {/* Y-axis tick labels */}
        {yTicks.map((tick, i) => (
          <text
            key={`ytl-${i}`}
            x={PAD_LEFT - 8}
            y={tick.y + 3}
            textAnchor="end"
            fontSize="10"
            fill={t.color.ink3}
          >
            {tick.label}
          </text>
        ))}

        {/* X-axis tick labels */}
        {xTicks.map((tick, i) => (
          <text
            key={`xtl-${i}`}
            x={tick.x}
            y={VB_H - PAD_BOTTOM + 14}
            textAnchor="middle"
            fontSize="10"
            fill={t.color.ink3}
          >
            {tick.label}
          </text>
        ))}
        <text
          x={PAD_LEFT + PLOT_W / 2}
          y={VB_H - 8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={t.color.ink2}
        >
          Spend
        </text>

        {/* HDI band */}
        <path d={bandPath} fill={t.color.accentSub} opacity="0.7" />

        {/* Mean curve */}
        <path d={linePath} fill="none" stroke={t.color.accent} strokeWidth="2.5" />

        {/* Efficient frontier marker (optional - only if meaningful) */}
        {efficient_frontier_spend > 0 && efficient_frontier_spend < maxSpend && (
          <text
            x={xFor(efficient_frontier_spend)}
            y={PAD_TOP - 10}
            textAnchor="middle"
            fontSize="10"
            fontStyle="italic"
            fill={t.color.ink3}
          >
            ↓ Efficient frontier ≈ {formatM(efficient_frontier_spend)}
          </text>
        )}

        {/* Current spend marker (red) */}
        <line
          x1={xFor(current_spend)}
          y1={PAD_TOP}
          x2={xFor(current_spend)}
          y2={VB_H - PAD_BOTTOM}
          stroke={t.color.negative}
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <circle
          cx={xFor(current_spend)}
          cy={yFor(currentPoint.revenue)}
          r="6"
          fill={t.color.negative}
        />
        <circle
          cx={xFor(current_spend)}
          cy={yFor(currentPoint.revenue)}
          r="10"
          fill="none"
          stroke={t.color.negative}
          strokeWidth="1.5"
          opacity="0.4"
        />
        <rect
          x={xFor(current_spend) + 10}
          y={yFor(currentPoint.revenue) - 22}
          width="130"
          height="42"
          rx="4"
          fill={t.color.negative}
        />
        <text
          x={xFor(current_spend) + 18}
          y={yFor(currentPoint.revenue) - 8}
          fontSize="10.5"
          fontWeight="700"
          fill="white"
        >
          CURRENT: {formatM(current_spend)}
        </text>
        <text
          x={xFor(current_spend) + 18}
          y={yFor(currentPoint.revenue) + 7}
          fontSize="10"
          fill="white"
        >
          ROAS {data.marginal_roas_current?.toFixed(1)}×
        </text>

        {/* Recommended marker (green) — only if meaningfully different from current */}
        {recSpendDiffers && (
          <>
            <line
              x1={xFor(recommended_spend)}
              y1={PAD_TOP}
              x2={xFor(recommended_spend)}
              y2={VB_H - PAD_BOTTOM}
              stroke={t.color.positive}
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <circle
              cx={xFor(recommended_spend)}
              cy={yFor(recommendedPoint.revenue)}
              r="6"
              fill={t.color.positive}
            />
            <rect
              x={xFor(recommended_spend) - 150}
              y={yFor(recommendedPoint.revenue) + 14}
              width="140"
              height="42"
              rx="4"
              fill={t.color.positive}
            />
            <text
              x={xFor(recommended_spend) - 143}
              y={yFor(recommendedPoint.revenue) + 30}
              fontSize="10.5"
              fontWeight="700"
              fill="white"
            >
              RECOMMENDED: {formatM(recommended_spend)}
            </text>
            <text
              x={xFor(recommended_spend) - 143}
              y={yFor(recommendedPoint.revenue) + 45}
              fontSize="10"
              fill="white"
            >
              ROAS {data.marginal_roas_recommended?.toFixed(1)}×
            </text>
          </>
        )}
      </Svg>
    </ChartWrap>
  );
}

export default ResponseCurveChart;
