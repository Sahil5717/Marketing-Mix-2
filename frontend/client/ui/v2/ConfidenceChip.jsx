import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * ConfidenceChip — subtle pill showing statistical confidence tier.
 *
 * Tiers (from pillar_aggregator / cx_engine):
 *   high         — p-value below 0.05 on adequate sample — green tint
 *   directional  — p-value in 0.05-0.15 range, or sample size marginal — amber tint
 *   inconclusive — small sample or p-value > 0.15                     — grey tint
 *   urgent       — time-sensitive (event window closing)              — red tint
 *                  (special-case, not strictly a confidence tier — used
 *                  on the Diwali-window opportunity where urgency matters
 *                  more than statistical confidence)
 *
 * Pairs with ActionChip. The two chips answer different questions:
 *   ActionChip      = what to do
 *   ConfidenceChip  = how sure we are
 */

const TIER_STYLES = {
  high: {
    bg: t.color.positiveBg,
    fg: t.color.positive,
    label: "High Confidence",
  },
  directional: {
    bg: t.color.warningBg,
    fg: t.color.warning,
    label: "Directional",
  },
  inconclusive: {
    bg: "#EDEDED",
    fg: t.color.neutral,
    label: "Inconclusive",
  },
  urgent: {
    bg: t.color.negativeBg,
    fg: t.color.negative,
    label: "Urgent",
  },
};

const Chip = styled.span`
  display: inline-block;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  font-family: ${t.fontV2.body};
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 10px;
  vertical-align: middle;
  white-space: nowrap;
`;

export function ConfidenceChip({ tier = "directional", children, days }) {
  const style = TIER_STYLES[tier] || TIER_STYLES.directional;
  const label = children ?? (days != null ? `${style.label} · ${days}d` : style.label);
  return <Chip $bg={style.bg} $fg={style.fg}>{label}</Chip>;
}

export default ConfidenceChip;
