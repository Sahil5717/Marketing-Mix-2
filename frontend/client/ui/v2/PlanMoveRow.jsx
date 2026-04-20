import styled from "styled-components";
import { t } from "../../tokens.js";
import { ActionChip } from "./ActionChip.jsx";
import { ConfidenceChip } from "./ConfidenceChip.jsx";

/**
 * PlanMoveRow — one row inside a pillar group on the Plan screen.
 *
 * Layout (per v5 Plan mockup):
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ [SHIFT]  Email                            $0.8M → $3.2M     │
 *   │          marginal ROAS 5.2× · response curve has headroom   │
 *   │                                            [REVENUE] [HIGH] │
 *   │                                                       +$3.8M │  →
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Differs from OpportunityRow (used on Diagnosis) in that Plan moves
 * are about budget reallocation, so the spend-shift block ($current → $recommended)
 * is the visual centerpiece. Diagnosis surfaces opportunities; Plan
 * surfaces actions.
 *
 * Props:
 *   pillar      — "revenue_uplift" | "cost_reduction" | "cx_uplift" — drives accent color
 *   actionVerb  — text for ActionChip ("Shift", "Cut Spend", "Orchestrate", etc)
 *   channel     — display-formatted channel name
 *   title       — short headline
 *   detail      — sub-description
 *   currentSpend, recommendedSpend — numbers; if either is null, spend-shift block hides
 *   changePct   — signed percentage (+18, -25)
 *   impact      — dollar impact of this move (number or null for non-numeric CX moves)
 *   confidence  — "high" | "directional" | "inconclusive"
 *   urgencyDays — optional integer; if set, renders Urgent chip
 *   onClick     — optional drill-through (typically to ChannelDetail)
 */

const PILLAR_INK = {
  revenue_uplift: t.color.pillarRev,
  cost_reduction: t.color.pillarCost,
  cx_uplift: t.color.pillarCx,
};

const PILLAR_TINT = {
  revenue_uplift: t.color.pillarRevSoft,
  cost_reduction: t.color.pillarCostSoft,
  cx_uplift: t.color.pillarCxSoft,
};

const Card = styled.div`
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-left: 3px solid ${({ $accent }) => $accent};
  border-radius: ${t.radius.md};
  padding: 16px 20px;
  margin-bottom: 8px;
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  align-items: center;
  gap: 16px;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  transition: border-color ${t.motion.base} ${t.motion.ease},
              box-shadow ${t.motion.base} ${t.motion.ease};

  &:hover {
    ${({ $clickable }) => $clickable && `
      border-color: ${t.color.borderStrong};
      box-shadow: ${t.shadow.card};
    `}
  }

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr auto;
    gap: 8px 12px;
  }
`;

const ActionCell = styled.div`
  min-width: 110px;
`;

const Body = styled.div`
  min-width: 0;
`;

const Channel = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 16px;
  font-weight: 600;
  color: ${t.color.ink};
  line-height: 1.2;
`;

const Detail = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11.5px;
  color: ${t.color.ink3};
  margin-top: 2px;
  line-height: 1.4;
`;

const SpendShift = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  color: ${t.color.ink2};
  white-space: nowrap;

  strong {
    font-family: ${t.fontV2.headline};
    font-size: 14px;
    color: ${t.color.ink};
    font-weight: 600;
  }
`;

const Arrow = styled.span`
  color: ${t.color.accent};
  margin: 0 6px;
  font-weight: 700;
`;

const ChangePct = styled.span`
  margin-left: 6px;
  font-weight: 600;
  font-size: 11.5px;
  color: ${({ $sign }) =>
    $sign === "up" ? t.color.positive : $sign === "down" ? t.color.negative : t.color.ink3};
`;

const PillarTagPill = styled.span`
  display: inline-block;
  font-family: ${t.fontV2.body};
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 10px;
  background: ${({ $tint }) => $tint};
  color: ${({ $ink }) => $ink};
  white-space: nowrap;
`;

const Chips = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
`;

const Impact = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 18px;
  font-weight: 600;
  color: ${({ $accent }) => $accent};
  min-width: 80px;
  text-align: right;
  white-space: nowrap;
`;

const DrillArrow = styled.span`
  color: ${t.color.ink3};
  font-size: 14px;
  font-weight: 600;
  user-select: none;
`;

const PILLAR_TAG_LABEL = {
  revenue_uplift: "Revenue",
  cost_reduction: "Cost",
  cx_uplift: "CX",
};

function fmtMoney(n) {
  if (n == null) return "";
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

function fmtImpact(n) {
  if (n == null) return "—";
  const v = Number(n) || 0;
  const prefix = v < 0 ? "-" : "+";
  if (Math.abs(v) >= 1e6) return `${prefix}$${(Math.abs(v) / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${prefix}$${Math.round(Math.abs(v) / 1e3)}K`;
  return `${prefix}$${Math.round(Math.abs(v))}`;
}

export function PlanMoveRow({
  pillar = "revenue_uplift",
  actionVerb,
  channel,
  title,
  detail,
  currentSpend,
  recommendedSpend,
  changePct,
  impact,
  confidence = "directional",
  urgencyDays,
  onClick,
}) {
  const accent = PILLAR_INK[pillar] || t.color.accent;
  const tint = PILLAR_TINT[pillar] || t.color.accentSub;
  const clickable = !!onClick;

  // Spend-shift display only when both numbers are present (CX moves omit them)
  const showSpendShift =
    currentSpend != null && recommendedSpend != null && currentSpend !== 0;

  const sign = changePct == null ? "flat" : changePct > 0 ? "up" : "down";

  return (
    <Card $accent={accent} $clickable={clickable} onClick={onClick}>
      <ActionCell>
        {actionVerb && <ActionChip pillar={pillar}>{actionVerb}</ActionChip>}
      </ActionCell>

      <Body>
        <Channel>{channel || title}</Channel>
        {detail && <Detail>{detail}</Detail>}
      </Body>

      {showSpendShift ? (
        <SpendShift>
          <strong>{fmtMoney(currentSpend)}</strong>
          <Arrow>→</Arrow>
          <strong>{fmtMoney(recommendedSpend)}</strong>
          {changePct != null && (
            <ChangePct $sign={sign}>
              {changePct > 0 ? "+" : ""}
              {changePct.toFixed(0)}%
            </ChangePct>
          )}
        </SpendShift>
      ) : (
        <SpendShift style={{ minWidth: 80 }}> </SpendShift>
      )}

      <Chips>
        <PillarTagPill $tint={tint} $ink={accent}>
          {PILLAR_TAG_LABEL[pillar]}
        </PillarTagPill>
        {urgencyDays != null && (
          <ConfidenceChip tier="urgent" days={urgencyDays} />
        )}
        <ConfidenceChip tier={confidence} />
      </Chips>

      <Impact $accent={accent}>{fmtImpact(impact)}</Impact>

      {clickable && <DrillArrow>→</DrillArrow>}
    </Card>
  );
}

export default PlanMoveRow;
