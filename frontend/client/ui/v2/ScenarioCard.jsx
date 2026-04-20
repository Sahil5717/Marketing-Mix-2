import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * ScenarioCard — one of three side-by-side cards on the Scenarios screen.
 *
 * Mockup (Option 1 Baseline / Option 2 Recommended [selected] / Option 3 Aggressive):
 *   ┌────────────────────────────  →
 *   │ OPTION 2 · RECOMMENDED    ● SELECTED
 *   │ Optimizer plan
 *   │
 *   │ +$14.1M
 *   │ PROJECTED LIFT
 *   │
 *   │ Reallocate $4.8M within budget · 20 moves
 *   │ ──────────────────────────
 *   │ PILLAR SPLIT
 *   │ Revenue ■■■■■■■■■  +$9.2M
 *   │ Cost    ■■■         +$3.1M
 *   │ CX      ■          +$1.8M
 *   │ ──────────────────────────
 *   │ SPEND       ROAS       CONFIDENCE
 *   │ $24.6M      3.3×       High
 *   └──────────────────────────────────
 *
 * Props:
 *   scenario — one item from /api/v2/scenarios scenarios[i]:
 *     { key, label, badge, selected, hero_value, hero_value_format,
 *       description, moves_count, pillar_split, stats }
 *   optionNumber — 1-indexed position ("OPTION 1", "OPTION 2", ...)
 *   isUiSelected — overrides backend's `selected` when user picks a different card
 *   onSelect — click handler
 *   onDrill — arrow-click handler (→ opens detail of that scenario)
 *
 * The selected card gets an amber border + accent-tinted shadow. The "SELECTED"
 * badge only appears on the selected card. The "HIGHER RISK" badge only
 * appears on the aggressive card.
 */

const PILLAR_COLORS = {
  revenue_uplift: t.color.pillarRev,
  cost_reduction: t.color.pillarCost,
  cx_uplift: t.color.pillarCx,
};

const PILLAR_LABELS = {
  revenue_uplift: "Revenue",
  cost_reduction: "Cost",
  cx_uplift: "CX",
};

const Card = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${({ $selected }) => ($selected ? t.color.accent : t.color.border)};
  box-shadow: ${({ $selected }) => ($selected ? `0 0 0 2px ${t.color.accentSub}` : "none")};
  border-radius: ${t.radius.xl};
  padding: 24px 24px 20px;
  cursor: pointer;
  transition: border-color ${t.motion.base} ${t.motion.ease},
              box-shadow ${t.motion.base} ${t.motion.ease};

  &:hover {
    border-color: ${({ $selected }) => ($selected ? t.color.accent : t.color.borderStrong)};
  }
`;

const DrillArrow = styled.span`
  position: absolute;
  top: 18px;
  right: 20px;
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${({ $selected }) => ($selected ? t.color.accent : t.color.ink3)};
  font-weight: 600;
  pointer-events: none;
`;

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
  padding-right: 40px; /* space for the drill arrow */
`;

const OptionLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${({ $accent }) => ($accent ? t.color.accent : t.color.ink3)};
  text-transform: uppercase;
`;

const Name = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 20px;
  font-weight: 600;
  color: ${t.color.ink};
  margin-top: 4px;
`;

const Badge = styled.span`
  display: inline-block;
  font-family: ${t.fontV2.body};
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 3px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  white-space: nowrap;

  /* Selected: solid amber */
  background: ${({ $variant }) =>
    $variant === "recommended"
      ? t.color.accent
      : $variant === "aggressive"
      ? t.color.negativeBg
      : "#EDEDED"};
  color: ${({ $variant }) =>
    $variant === "recommended"
      ? "white"
      : $variant === "aggressive"
      ? t.color.negative
      : t.color.ink3};
`;

const HeroValue = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 56px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -1.5px;
  margin-top: 18px;
  color: ${({ $selected }) => ($selected ? t.color.accent : t.color.ink)};
`;

const HeroLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
  margin-top: 8px;
`;

const Description = styled.div`
  margin-top: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid ${t.color.border};
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  color: ${t.color.ink2};
  line-height: 1.45;

  strong {
    color: ${t.color.ink};
    font-weight: 600;
  }
`;

const SplitSection = styled.div`
  margin-top: 16px;
`;

const SplitTitle = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wide};
  color: ${t.color.ink3};
  text-transform: uppercase;
  margin-bottom: 10px;
`;

const SplitBarRow = styled.div`
  display: grid;
  grid-template-columns: 76px 1fr 66px;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
`;

const SplitLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  font-weight: 600;
  color: ${t.color.ink2};
`;

const BarTrack = styled.div`
  height: 12px;
  background: ${t.color.canvas};
  border-radius: 3px;
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  background: ${({ $color }) => $color};
  width: ${({ $pct }) => `${$pct}%`};
  border-radius: 3px;
  transition: width 400ms ${t.motion.ease};
`;

const SplitValue = styled.div`
  text-align: right;
  font-family: ${t.fontV2.headline};
  font-size: 12px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid ${t.color.border};
`;

const StatLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 9.5px;
  letter-spacing: ${t.tracking.wide};
  text-transform: uppercase;
  color: ${t.color.ink3};
  font-weight: 600;
`;

const StatValue = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 16px;
  font-weight: 600;
  color: ${({ $tone }) =>
    $tone === "high" ? t.color.positive :
    $tone === "directional" ? t.color.accent :
    t.color.ink};
  margin-top: 3px;
`;

function formatHero(value, fmt) {
  if (fmt === "zero" || value === 0) return "$0";
  const v = Number(value) || 0;
  if (Math.abs(v) >= 1e6) return `+$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `+$${Math.round(v / 1e3)}K`;
  return `+$${Math.round(v)}`;
}

function formatCurrency(value) {
  if (value == null) return "—";
  const v = Number(value) || 0;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

function formatConfidence(c) {
  if (!c) return "—";
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function ScenarioCard({
  scenario,
  optionNumber,
  isUiSelected,
  onSelect,
  onDrill,
}) {
  if (!scenario) return null;
  const selected = isUiSelected ?? scenario.selected;
  const pillarSplit = scenario.pillar_split || {};

  // Normalize bar widths against the largest value in the scenario's split.
  // This keeps relative proportions readable per card.
  const splitValues = ["revenue_uplift", "cost_reduction", "cx_uplift"].map(
    (k) => Number(pillarSplit[k] || 0)
  );
  const maxSplit = Math.max(...splitValues, 1); // avoid divide by zero

  const optionLabel =
    scenario.key === "recommended"
      ? `Option ${optionNumber} · Recommended`
      : `Option ${optionNumber}`;

  return (
    <Card $selected={selected} onClick={onSelect}>
      <DrillArrow
        $selected={selected}
        onClick={(e) => {
          e.stopPropagation();
          if (onDrill) onDrill(scenario);
        }}
      >
        →
      </DrillArrow>

      <Head>
        <div>
          <OptionLabel $accent={scenario.key === "recommended"}>{optionLabel}</OptionLabel>
          <Name>{scenario.label}</Name>
        </div>
        <Badge $variant={selected ? "recommended" : scenario.key === "aggressive" ? "aggressive" : "baseline"}>
          {selected ? "● Selected" : scenario.badge}
        </Badge>
      </Head>

      <HeroValue $selected={selected}>
        {formatHero(scenario.hero_value, scenario.hero_value_format)}
      </HeroValue>
      <HeroLabel>Projected lift</HeroLabel>

      <Description>{scenario.description}</Description>

      <SplitSection>
        <SplitTitle>Pillar split</SplitTitle>
        {["revenue_uplift", "cost_reduction", "cx_uplift"].map((pk) => {
          const val = Number(pillarSplit[pk] || 0);
          const pct = maxSplit > 0 ? (val / maxSplit) * 100 : 0;
          return (
            <SplitBarRow key={pk}>
              <SplitLabel>{PILLAR_LABELS[pk]}</SplitLabel>
              <BarTrack>
                <BarFill $color={PILLAR_COLORS[pk]} $pct={pct} />
              </BarTrack>
              <SplitValue>{val > 0 ? `+${formatCurrency(val)}` : "$0"}</SplitValue>
            </SplitBarRow>
          );
        })}
      </SplitSection>

      <StatsRow>
        <div>
          <StatLabel>Spend</StatLabel>
          <StatValue>{formatCurrency(scenario.stats?.total_spend)}</StatValue>
        </div>
        <div>
          <StatLabel>ROAS</StatLabel>
          <StatValue>
            {scenario.stats?.roas != null ? `${scenario.stats.roas}×` : "—"}
          </StatValue>
        </div>
        <div>
          <StatLabel>Confidence</StatLabel>
          <StatValue $tone={scenario.stats?.confidence}>
            {formatConfidence(scenario.stats?.confidence)}
          </StatValue>
        </div>
      </StatsRow>
    </Card>
  );
}

export default ScenarioCard;
