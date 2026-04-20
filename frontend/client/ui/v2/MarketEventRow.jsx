import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * MarketEventRow — one event row in the Market Context events timeline.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ● Competitor IPL Sponsorship    In 3 weeks    -8%            │
 *   │   Reach-level competitive event ·           EXPECTED IMPACT   │
 *   │   reduces brand share of voice                                │
 *   │   [AFFECTS REVENUE] [AFFECTS CX]                              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Props:
 *   event — /api/v2/market-context events[i]
 *   isFirst — suppresses top border (first row)
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
  revenue_uplift: "Affects Revenue",
  cost_reduction: "Affects Cost",
  cx_uplift: "Affects CX",
};

const Row = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr 130px 110px;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid ${({ $first }) => ($first ? "transparent" : t.color.border)};
  align-items: start;
`;

const Dot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $direction }) =>
    $direction === "up"
      ? t.color.positive
      : $direction === "down"
      ? t.color.negative
      : t.color.neutral};
  margin-top: 7px;
`;

const NameBlock = styled.div``;

const Name = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 14px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const Description = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink2};
  line-height: 1.4;
  margin-top: 3px;
  margin-bottom: 8px;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const PillarTag = styled.span`
  display: inline-block;
  font-family: ${t.fontV2.body};
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.7px;
  padding: 3px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  background: ${({ $pillar }) => PILLAR_SOFT[$pillar] || t.color.sunken};
  color: ${({ $pillar }) => PILLAR_INK[$pillar] || t.color.ink2};
`;

const WhenBlock = styled.div`
  text-align: center;
  padding-top: 1px;
`;

const WhenLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const WhenDate = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};
  margin-top: 2px;
`;

const ImpactBlock = styled.div`
  text-align: right;
  padding-top: 1px;
`;

const ImpactValue = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 22px;
  font-weight: 600;
  color: ${({ $direction }) =>
    $direction === "up" ? t.color.positive :
    $direction === "down" ? t.color.negative :
    t.color.ink};
  line-height: 1;
`;

const ImpactLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 9.5px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${t.color.ink3};
  font-weight: 600;
  margin-top: 4px;
`;

export function MarketEventRow({ event, isFirst = false }) {
  if (!event) return null;
  const direction = event.direction || "flat";
  const impactSigned =
    event.impact_pct > 0
      ? `+${Math.round(event.impact_pct)}%`
      : event.impact_pct < 0
      ? `${Math.round(event.impact_pct)}%`
      : "0%";

  return (
    <Row $first={isFirst}>
      <Dot $direction={direction} />
      <NameBlock>
        <Name>{event.name}</Name>
        {event.description && <Description>{event.description}</Description>}
        {event.pillars_affected?.length > 0 && (
          <TagRow>
            {event.pillars_affected.map((p) => (
              <PillarTag key={p} $pillar={p}>
                {PILLAR_LABEL[p] || p}
              </PillarTag>
            ))}
          </TagRow>
        )}
      </NameBlock>
      <WhenBlock>
        <WhenLabel>{event.when_label}</WhenLabel>
        {event.date_label && <WhenDate>{event.date_label}</WhenDate>}
      </WhenBlock>
      <ImpactBlock>
        <ImpactValue $direction={direction}>{impactSigned}</ImpactValue>
        <ImpactLabel>
          {direction === "up" ? "Expected lift" : direction === "down" ? "Expected impact" : "No change"}
        </ImpactLabel>
      </ImpactBlock>
    </Row>
  );
}

export default MarketEventRow;
