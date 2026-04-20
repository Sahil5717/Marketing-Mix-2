import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * ActionChip — solid pillar-colored chip showing the action verb.
 *
 * Used on opportunity rows in DiagnosisV2, Plan v2, Scenarios v2 and on
 * recommendation rows in ChannelDetail v2. The verb (Shift, Scale, Cut
 * Spend, Renegotiate, Orchestrate, Cap Freq, Fix Lag, Fix Friction) tells
 * the user what to DO. The color identifies which pillar the action
 * belongs to.
 *
 * Props:
 *   pillar   — "revenue_uplift" | "cost_reduction" | "cx_uplift"
 *              (controls the background color)
 *   children — the action verb text (usually 1-2 words)
 *
 * Pairs with ConfidenceChip — the two chips appear side by side:
 *   [SHIFT] [HIGH CONFIDENCE]
 * ActionChip = what to do. ConfidenceChip = how sure we are.
 */

const PILLAR_COLORS = {
  revenue_uplift: t.color.pillarRev,
  cost_reduction: t.color.pillarCost,
  cx_uplift: t.color.pillarCx,
};

const Chip = styled.span`
  display: inline-block;
  background: ${({ $bg }) => $bg};
  color: white;
  font-family: ${t.fontV2.body};
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 3px;
  vertical-align: middle;
  white-space: nowrap;
`;

export function ActionChip({ pillar = "revenue_uplift", children }) {
  const bg = PILLAR_COLORS[pillar] || t.color.neutral;
  return <Chip $bg={bg}>{children}</Chip>;
}

export default ActionChip;
