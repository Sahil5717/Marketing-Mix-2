import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * ChannelComparisonTable — bottom section of the Scenarios screen.
 *
 * Shows all 12 channels side-by-side under the three scenarios. The
 * recommended column is highlighted (tinted background) so the eye
 * naturally compares "what changes under the plan we're recommending".
 *
 * Each row ends with a pillar pill showing which pillar the channel's
 * recommended move falls under.
 *
 * Props:
 *   data — object from /api/v2/scenarios channel_table:
 *     { columns: ["baseline","recommended","aggressive"],
 *       rows: [{channel, baseline, recommended, aggressive, primary_pillar}],
 *       totals: {baseline, recommended, aggressive} }
 *   onOpenChannels — "Open Channels →" link handler
 *   onApplyPlan — primary-CTA handler (activates the Recommended scenario)
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
  revenue_uplift: "Revenue",
  cost_reduction: "Cost",
  cx_uplift: "CX",
};

const Card = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  padding: 24px 28px 20px;
  margin-bottom: 26px;
`;

const Head = styled.div`
  margin-bottom: 20px;
`;

const Title = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 20px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const Sub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wide};
`;

const DrillLink = styled.a`
  position: absolute;
  top: 22px;
  right: 28px;
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.accent};
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;

  &::after { content: " →"; }
  &:hover { color: ${t.color.accentHover}; }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${t.fontV2.body};
  font-size: 13px;
`;

const Th = styled.th`
  text-align: ${({ $align }) => $align || "left"};
  padding: 0 10px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wide};
  text-transform: uppercase;
  color: ${({ $highlight }) => ($highlight ? t.color.accent : t.color.ink3)};
  border-bottom: 2px solid ${t.color.border};
`;

const Td = styled.td`
  padding: 12px 10px;
  border-bottom: 1px solid ${t.color.border};
  color: ${t.color.ink};
  text-align: ${({ $align }) => $align || "left"};
  font-weight: ${({ $bold }) => ($bold ? 600 : 400)};
  background: ${({ $highlight }) => ($highlight ? t.color.accentSub : "transparent")};
  font-family: ${({ $serif }) => ($serif ? t.fontV2.headline : t.fontV2.body)};
  font-size: ${({ $serif }) => ($serif ? "14px" : "13px")};
`;

const PillarPill = styled.span`
  display: inline-block;
  font-family: ${t.fontV2.body};
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
  padding: 2px 6px;
  border-radius: 8px;
  text-transform: uppercase;
  background: ${({ $pillar }) => PILLAR_SOFT[$pillar] || t.color.sunken};
  color: ${({ $pillar }) => PILLAR_INK[$pillar] || t.color.ink2};
`;

const TotalsRow = styled.tr`
  td {
    font-weight: 700;
    padding-top: 16px;
    padding-bottom: 16px;
    border-bottom: none;
    border-top: 2px solid ${t.color.ink};
    font-size: ${({ $numeric }) => $numeric ? "18px" : "13px"};
  }
`;

const TotalsTd = styled.td`
  font-family: ${t.fontV2.headline};
  font-weight: 600;
  padding-top: 16px;
  padding-bottom: 16px;
  border-bottom: none;
  border-top: 2px solid ${t.color.ink};
  text-align: ${({ $align }) => $align || "right"};
  font-size: 18px;
  background: ${({ $highlight }) => ($highlight ? t.color.accentSub : "transparent")};
`;

const CtaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  gap: 12px;
`;

const CtaHint = styled.span`
  font-family: ${t.fontV2.body};
  font-size: 11.5px;
  color: ${t.color.ink3};

  strong {
    color: ${t.color.ink};
    font-weight: 600;
  }
`;

const SecondaryBtn = styled.button`
  background: transparent;
  color: ${t.color.ink2};
  padding: 10px 14px;
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.md};
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover { border-color: ${t.color.borderStrong}; }
`;

const PrimaryBtn = styled.button`
  background: ${t.color.accent};
  color: white;
  padding: 10px 20px;
  border-radius: ${t.radius.md};
  border: 1px solid ${t.color.accent};
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${t.motion.base} ${t.motion.ease};

  &::after { content: " →"; }
  &:hover { background: ${t.color.accentHover}; border-color: ${t.color.accentHover}; }
`;

function formatCurrency(n) {
  if (n == null) return "—";
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

export function ChannelComparisonTable({ data, onOpenChannels, onApplyPlan }) {
  if (!data || !data.rows || data.rows.length === 0) return null;

  return (
    <Card>
      {onOpenChannels && <DrillLink onClick={onOpenChannels}>Open Channels</DrillLink>}
      <Head>
        <Title>Channel-level moves by scenario</Title>
        <Sub>
          {data.rows.length} channels · ranked by baseline spend · click row for detail
        </Sub>
      </Head>

      <Table>
        <thead>
          <tr>
            <Th $align="left" style={{ paddingLeft: 0, width: "28%" }}>Channel</Th>
            <Th $align="right" style={{ width: "17%" }}>Baseline</Th>
            <Th $align="right" $highlight style={{ width: "17%" }}>Recommended</Th>
            <Th $align="right" style={{ width: "17%" }}>Aggressive</Th>
            <Th $align="right" style={{ width: "15%" }}>Primary pillar</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={`${row.channel}-${i}`}>
              <Td $bold style={{ paddingLeft: 0 }}>{row.channel}</Td>
              <Td $align="right" $serif>{formatCurrency(row.baseline)}</Td>
              <Td $align="right" $serif $highlight>{formatCurrency(row.recommended)}</Td>
              <Td $align="right" $serif>{formatCurrency(row.aggressive)}</Td>
              <Td $align="right">
                <PillarPill $pillar={row.primary_pillar}>
                  {PILLAR_LABEL[row.primary_pillar] || ""}
                </PillarPill>
              </Td>
            </tr>
          ))}
          <TotalsRow>
            <TotalsTd $align="left" style={{ paddingLeft: 0 }}>Total spend</TotalsTd>
            <TotalsTd>{formatCurrency(data.totals.baseline)}</TotalsTd>
            <TotalsTd $highlight>{formatCurrency(data.totals.recommended)}</TotalsTd>
            <TotalsTd>{formatCurrency(data.totals.aggressive)}</TotalsTd>
            <TotalsTd style={{ fontSize: 11, color: t.color.ink3, fontFamily: t.fontV2.body, fontWeight: 500 }}>
              Within / above budget
            </TotalsTd>
          </TotalsRow>
        </tbody>
      </Table>

      <CtaRow>
        <CtaHint>
          Switching to <strong>Recommended</strong> executes the moves above across 3 pillars.
        </CtaHint>
        <div style={{ display: "flex", gap: 10 }}>
          <SecondaryBtn onClick={() => window.print()}>Export to PDF</SecondaryBtn>
          {onApplyPlan && <PrimaryBtn onClick={onApplyPlan}>Apply Recommended plan</PrimaryBtn>}
        </div>
      </CtaRow>
    </Card>
  );
}

export default ChannelComparisonTable;
