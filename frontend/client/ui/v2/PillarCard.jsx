import styled from "styled-components";
import { t } from "../../tokens.js";
import { OpportunityRow } from "./OpportunityRow.jsx";

/**
 * PillarCard — one of the three pillar cards on DiagnosisV2.
 *
 * Structure (per v5 mockup):
 *   ┌──────────────────────────────────── (accent bar top)
 *   │ REVENUE UPLIFT
 *   │
 *   │ +$9.2M
 *   │ Recoverable by reallocating spend toward channels with unused
 *   │ response-curve headroom. 11 opportunities identified.
 *   │
 *   │ ─────────────────────────────
 *   │  UNDER-INVESTED    MARGINAL ROAS
 *   │  6 of 12            4.1×
 *   │ ─────────────────────────────
 *   │
 *   │ TOP OPPORTUNITIES                        3 of 11
 *   │ [OpportunityRow × 3]
 *   │ ─────────────────────────────
 *   │ Show all 11 opportunities →    Verified via Bayesian MMM
 *   └──────────────────────────────────────────
 *
 * Props:
 *   data — the pillar block from /api/v2/diagnosis:
 *     { pillar, headline_value, opportunity_count, caption,
 *       metrics: { primary_label, primary_value, secondary_label, secondary_value },
 *       opportunities: [ ... ] }
 *   topOpportunities — how many opportunities to render inline (default 3)
 *   methodologyLabel — right-side footer text ("Verified via Bayesian MMM"
 *                      for Revenue/Cost, "Derived from journey analytics" for CX)
 *   onShowAll         — fired when "Show all N →" link is clicked
 *   onOpportunityClick — fired with the opportunity object when a row is clicked
 */

const PILLAR_ACCENT = {
  revenue_uplift: t.color.pillarRev,
  cost_reduction: t.color.pillarCost,
  cx_uplift: t.color.pillarCx,
};

const PILLAR_TAG_LABEL = {
  revenue_uplift: "Revenue Uplift",
  cost_reduction: "Cost Reduction",
  cx_uplift: "CX Uplift",
};

const Card = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  padding: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 100%;
`;

const AccentBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${({ $accent }) => $accent};
`;

const PillarTag = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${({ $accent }) => $accent};
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const Headline = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 42px;
  font-weight: 600;
  line-height: 1;
  color: ${t.color.ink};
  margin-bottom: 6px;
  letter-spacing: -0.5px;
`;

const Caption = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink2};
  margin-bottom: 20px;
  line-height: 1.4;

  strong {
    color: ${t.color.ink};
    font-weight: 600;
  }
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid ${t.color.border};
  border-bottom: 1px solid ${t.color.border};
  margin-bottom: 18px;
`;

const MetricLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  letter-spacing: ${t.tracking.wide};
  text-transform: uppercase;
  color: ${t.color.ink3};
  font-weight: 600;
  margin-bottom: 4px;
`;

const MetricValue = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 18px;
  font-weight: 600;
  color: ${t.color.ink};
  line-height: 1;
`;

const OpsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
`;

const OpsTitle = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wide};
  color: ${t.color.ink2};
  text-transform: uppercase;
`;

const OpsCount = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};
`;

const Footer = styled.div`
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid ${t.color.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: ${t.fontV2.body};
  font-size: 12px;
`;

const ShowMore = styled.a`
  color: ${t.color.accent};
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    color: ${t.color.accentHover};
  }

  &::after {
    content: " →";
  }
`;

const Methodology = styled.span`
  color: ${t.color.ink3};
  font-size: 11px;
`;

const EmptyState = styled.div`
  padding: 18px 4px 2px;
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  color: ${t.color.ink3};
  line-height: 1.45;
  font-style: italic;
`;

function formatHeadline(dollars) {
  const n = Number(dollars) || 0;
  if (Math.abs(n) >= 1e6) return `+$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `+$${Math.round(n / 1e3)}K`;
  return `+$${Math.round(n)}`;
}

export function PillarCard({
  data,
  topOpportunities = 3,
  methodologyLabel,
  onShowAll,
  onOpportunityClick,
}) {
  if (!data) return null;
  const {
    pillar,
    headline_value,
    opportunity_count,
    caption,
    metrics = {},
    opportunities = [],
  } = data;
  const accent = PILLAR_ACCENT[pillar] || t.color.accent;
  const tag = PILLAR_TAG_LABEL[pillar] || pillar;
  const shown = opportunities.slice(0, topOpportunities);

  return (
    <Card>
      <AccentBar $accent={accent} />
      <PillarTag $accent={accent}>{tag}</PillarTag>
      <Headline>{formatHeadline(headline_value)}</Headline>
      <Caption>
        {caption}
        {opportunity_count > 0 && (
          <>
            {" "}
            <strong>
              {opportunity_count} opportunit{opportunity_count === 1 ? "y" : "ies"}{" "}
              identified.
            </strong>
          </>
        )}
      </Caption>

      <MetricsRow>
        <div>
          <MetricLabel>{metrics.primary_label}</MetricLabel>
          <MetricValue>{metrics.primary_value}</MetricValue>
        </div>
        <div>
          <MetricLabel>{metrics.secondary_label}</MetricLabel>
          <MetricValue>{metrics.secondary_value}</MetricValue>
        </div>
      </MetricsRow>

      {opportunity_count === 0 ? (
        <EmptyState>
          No material opportunities in this pillar for the current period —
          all channels appear well-allocated on this dimension.
        </EmptyState>
      ) : (
        <>
          <OpsHeader>
            <OpsTitle>Top opportunities</OpsTitle>
            <OpsCount>
              {shown.length} of {opportunity_count}
            </OpsCount>
          </OpsHeader>

          {shown.map((opp, idx) => (
            <OpportunityRow
              key={`${opp.title}-${idx}`}
              pillar={pillar}
              impact={opp.estimated_impact}
              title={opp.title}
              detail={opp.detail}
              actionVerb={opp.action_verb}
              confidence={opp.confidence}
              urgencyDays={opp.urgency_days}
              isFirst={idx === 0}
              onClick={onOpportunityClick ? () => onOpportunityClick(opp) : undefined}
            />
          ))}
        </>
      )}

      <Footer>
        {opportunity_count > shown.length && onShowAll ? (
          <ShowMore onClick={onShowAll}>
            Show all {opportunity_count} opportunities
          </ShowMore>
        ) : (
          <span />
        )}
        {methodologyLabel && <Methodology>{methodologyLabel}</Methodology>}
      </Footer>
    </Card>
  );
}

export default PillarCard;
