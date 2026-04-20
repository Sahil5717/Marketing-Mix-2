import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * ChannelVitals — right-sidebar card on the Channel Detail screen.
 *
 * Props:
 *   data — /api/v2/channel vitals:
 *     { spend, share_of_spend_pct, roas, frequency, confidence,
 *       model_r2, weeks_of_data }
 *   onAllVitals — "All vitals →" link handler
 */

const Card = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  padding: 24px 28px;
`;

const Link = styled.a`
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
`;

const Title = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 17px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const Sub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10.5px;
  color: ${t.color.ink3};
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wide};
  margin-bottom: 16px;
`;

const StatBlock = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid ${t.color.border};

  &:first-of-type { padding-top: 0; }
  &:last-of-type { border-bottom: none; padding-bottom: 0; }
`;

const StatLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wide};
  text-transform: uppercase;
  color: ${t.color.ink3};
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 22px;
  font-weight: 600;
  color: ${({ $tone }) =>
    $tone === "down" ? t.color.negative :
    $tone === "up" ? t.color.positive :
    $tone === "high" ? t.color.positive :
    t.color.ink};
  line-height: 1;
`;

const StatUnit = styled.span`
  font-family: ${t.fontV2.headline};
  font-size: 14px;
  color: ${t.color.ink2};
  margin-left: 2px;
`;

const StatSub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};
  margin-top: 4px;
`;

function formatCurrency(n) {
  if (n == null) return "—";
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}`;
  return `$${Math.round(v)}`;
}

function currencyUnit(n) {
  if (n == null) return "";
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e6) return "M";
  if (v >= 1e3) return "K";
  return "";
}

export function ChannelVitals({ data, onAllVitals }) {
  if (!data) return null;

  return (
    <Card>
      {onAllVitals && <Link onClick={onAllVitals}>All vitals</Link>}
      <Title>Channel vitals</Title>
      <Sub>Q3 2026 · vs prior quarters</Sub>

      <StatBlock>
        <StatLabel>Spend</StatLabel>
        <StatValue>
          {formatCurrency(data.spend)}
          <StatUnit>{currencyUnit(data.spend)}</StatUnit>
        </StatValue>
        <StatSub>{data.share_of_spend_pct}% of total marketing spend</StatSub>
      </StatBlock>

      <StatBlock>
        <StatLabel>ROAS</StatLabel>
        <StatValue $tone={data.roas < 2 ? "down" : "up"}>
          {data.roas != null ? data.roas.toFixed(1) : "—"}
          <StatUnit>×</StatUnit>
        </StatValue>
        <StatSub>
          {data.roas != null && data.roas >= 2
            ? "at or above portfolio baseline"
            : "below portfolio baseline"}
        </StatSub>
      </StatBlock>

      {data.frequency != null && (
        <StatBlock>
          <StatLabel>Frequency</StatLabel>
          <StatValue>
            {data.frequency}
            <StatUnit>/wk</StatUnit>
          </StatValue>
          <StatSub>within CX-safe range</StatSub>
        </StatBlock>
      )}

      <StatBlock>
        <StatLabel>Confidence</StatLabel>
        <StatValue
          $tone={
            data.confidence === "High" ? "high" :
            data.confidence === "Directional" ? "up" : undefined
          }
        >
          {data.confidence}
        </StatValue>
        <StatSub>
          R² {data.model_r2} · {data.weeks_of_data} weeks of data
        </StatSub>
      </StatBlock>
    </Card>
  );
}

export default ChannelVitals;
