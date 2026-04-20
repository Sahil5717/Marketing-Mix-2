import styled from "styled-components";
import { t } from "../../tokens.js";
import { ActionChip } from "./ActionChip.jsx";
import { ConfidenceChip } from "./ConfidenceChip.jsx";

/**
 * OpportunityRow — one action line inside a PillarCard.
 *
 * Layout (per v5 Diagnosis mockup):
 *   ┌─────────────────────────────────────────────────┐
 *   │ +$3.8M  Reallocate $2.4M into Email from Paid   │
 *   │ Email marginal ROAS 5.2× vs Paid Search 1.9×.   │
 *   │ Response curve has material headroom…           │
 *   │ [SHIFT]  [HIGH CONFIDENCE]                       │
 *   └─────────────────────────────────────────────────┘
 *
 * Props:
 *   pillar          — "revenue_uplift" | "cost_reduction" | "cx_uplift" (colors)
 *   impact          — dollar number (e.g. 3800000)
 *   title           — action title line
 *   detail          — sub-description (optional)
 *   actionVerb      — text for the ActionChip (e.g. "Shift")
 *   confidence      — "high" | "directional" | "inconclusive" for ConfidenceChip
 *   urgencyDays     — if set, renders an "Urgent · Nd" chip before confidence
 *   isFirst         — suppresses the top border (first row in a pillar)
 *   onClick         — drill-through to channel detail (optional)
 */

const Row = styled.div`
  padding: 14px 0;
  border-top: 1px solid ${t.color.border};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  transition: background ${t.motion.base} ${t.motion.ease};

  &:first-of-type,
  &[data-first="true"] {
    border-top: none;
    padding-top: 4px;
  }

  &:hover {
    background: ${({ $clickable }) => ($clickable ? t.color.sunken : "transparent")};
  }
`;

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 4px;
`;

const PILLAR_INK_COLORS = {
  revenue_uplift: t.color.pillarRev,
  cost_reduction: t.color.pillarCost,
  cx_uplift: t.color.pillarCx,
};

const Impact = styled.span`
  font-family: ${t.fontV2.headline};
  font-size: 16px;
  font-weight: 600;
  color: ${({ $pillar }) => PILLAR_INK_COLORS[$pillar] || t.color.ink};
  white-space: nowrap;
  flex: 0 0 auto;
`;

const ActionTitle = styled.span`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  font-weight: 600;
  color: ${t.color.ink};
  line-height: 1.35;
`;

const Detail = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink2};
  line-height: 1.4;
  margin-top: 4px;
  margin-bottom: 8px;
`;

const Chips = styled.div`
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

function formatImpact(dollars) {
  const n = Number(dollars) || 0;
  if (Math.abs(n) >= 1e6) return `+$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `+$${Math.round(n / 1e3)}K`;
  return `+$${Math.round(n)}`;
}

export function OpportunityRow({
  pillar = "revenue_uplift",
  impact,
  title,
  detail,
  actionVerb,
  confidence = "directional",
  urgencyDays,
  isFirst = false,
  onClick,
}) {
  const clickable = !!onClick;
  return (
    <Row
      data-first={isFirst ? "true" : "false"}
      $clickable={clickable}
      onClick={onClick}
    >
      <Head>
        <Impact $pillar={pillar}>{formatImpact(impact)}</Impact>
        <ActionTitle>{title}</ActionTitle>
      </Head>
      {detail && <Detail>{detail}</Detail>}
      <Chips>
        {actionVerb && <ActionChip pillar={pillar}>{actionVerb}</ActionChip>}
        {urgencyDays != null && (
          <ConfidenceChip tier="urgent" days={urgencyDays} />
        )}
        <ConfidenceChip tier={confidence} />
      </Chips>
    </Row>
  );
}

export default OpportunityRow;
