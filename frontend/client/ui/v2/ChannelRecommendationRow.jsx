import styled from "styled-components";
import { t } from "../../tokens.js";
import { ActionChip } from "./ActionChip.jsx";
import { ConfidenceChip } from "./ConfidenceChip.jsx";

/**
 * ChannelRecommendationRow — single recommendation row on Channel Detail.
 *
 * Layout:
 *   [REVENUE UPLIFT]  [SCALE]  Scale Paid Search spend by +75%    [HIGH] +$8.0M →
 *                             Current spend below efficient frontier…
 *
 * Props:
 *   rec — /api/v2/channel recommendations[i]:
 *     { pillar, action_verb, title, detail, impact, confidence }
 *   onClick — drill-through handler
 */

const PILLAR_SOFT = {
  revenue_uplift: t.color.pillarRevSoft,
  cost_reduction: t.color.pillarCostSoft,
  cx_uplift: t.color.pillarCxSoft,
};
const PILLAR_INK = {
  revenue_uplift: t.color.pillarRev,
  cost_reduction: t.color.pillarCost,
  cx_uplift: t.color.pillarCx,
};
const PILLAR_LABEL = {
  revenue_uplift: "Revenue Uplift",
  cost_reduction: "Cost Reduction",
  cx_uplift: "CX Uplift",
};

const Row = styled.div`
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-left: 3px solid ${({ $accent }) => $accent};
  border-radius: ${t.radius.md};
  padding: 16px 22px;
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: 140px 110px 1fr 110px 100px 16px;
  align-items: center;
  gap: 12px;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  transition: background ${t.motion.base} ${t.motion.ease};

  &:hover {
    background: ${({ $clickable }) => ($clickable ? t.color.sunken : t.color.surface)};
  }

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 110px 1fr 100px;
    & > .hide-narrow { display: none; }
  }
`;

const PillarPill = styled.span`
  display: inline-block;
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 4px 10px;
  border-radius: 10px;
  text-transform: uppercase;
  background: ${({ $pillar }) => PILLAR_SOFT[$pillar] || t.color.sunken};
  color: ${({ $pillar }) => PILLAR_INK[$pillar] || t.color.ink2};
`;

const Title = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 14px;
  font-weight: 600;
  color: ${t.color.ink};
  margin-bottom: 3px;
`;

const Detail = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink2};
  line-height: 1.4;
`;

const Impact = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 18px;
  font-weight: 600;
  color: ${({ $accent }) => $accent};
  text-align: right;
`;

const DrillArrow = styled.span`
  color: ${t.color.ink3};
  font-size: 14px;
  font-weight: 600;
  text-align: right;
`;

function formatImpact(n) {
  if (n == null) return "—";
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `+$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `+$${Math.round(v / 1e3)}K`;
  return `+$${Math.round(v)}`;
}

export function ChannelRecommendationRow({ rec, onClick }) {
  if (!rec) return null;
  const accent = PILLAR_INK[rec.pillar] || t.color.accent;
  const clickable = !!onClick;

  return (
    <Row $accent={accent} $clickable={clickable} onClick={onClick}>
      <div className="hide-narrow">
        <PillarPill $pillar={rec.pillar}>{PILLAR_LABEL[rec.pillar] || ""}</PillarPill>
      </div>
      <div>
        <ActionChip pillar={rec.pillar}>{rec.action_verb}</ActionChip>
      </div>
      <div>
        <Title>{rec.title}</Title>
        <Detail>{rec.detail}</Detail>
      </div>
      <div className="hide-narrow" style={{ textAlign: "right" }}>
        <ConfidenceChip tier={rec.confidence || "directional"} />
      </div>
      <Impact $accent={accent}>{formatImpact(rec.impact)}</Impact>
      <DrillArrow>→</DrillArrow>
    </Row>
  );
}

export default ChannelRecommendationRow;
