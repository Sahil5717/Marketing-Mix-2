import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * MarketOverlayBanner — full-width banner card on the Plan screen showing
 * which market signals are currently shaping the plan.
 *
 * Layout (per v5 mockup):
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ ● MARKET OVERLAY · APPLIED                Open Market Context → │
 *   │ Current market conditions adjust baseline plan impact            │
 *   │ 6 signals applied: 2 events · 2 cost trends · 2 competitive      │
 *   │                                                                   │
 *   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
 *   │  │ Diwali   │ │ PaidSrch │ │ Display  │ │ Comp.IPL │            │
 *   │  │ +22%     │ │ CPC +22% │ │ CPM -13% │ │ -8% 20d  │            │
 *   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Props:
 *   data — { applied, net_impact, signals_count, signals: [{label, value_text, direction, source}] }
 *   onOpenMarketContext — link click handler
 */

const Banner = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-left: 3px solid ${t.color.accent};
  border-radius: ${t.radius.lg};
  padding: 20px 24px;
  margin-bottom: 26px;
`;

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
  gap: 16px;
`;

const HeadLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const Eyebrow = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.accent};
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const Headline = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 17px;
  font-weight: 600;
  color: ${t.color.ink};
  line-height: 1.3;
`;

const Sub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink3};
  margin-top: 4px;
`;

const HeadRight = styled.div`
  text-align: right;
  white-space: nowrap;
  flex-shrink: 0;
`;

const NetImpact = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 24px;
  font-weight: 600;
  color: ${({ $sign }) =>
    $sign === "up" ? t.color.positive : $sign === "down" ? t.color.negative : t.color.ink};
  line-height: 1;
`;

const NetImpactLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  letter-spacing: ${t.tracking.wide};
  color: ${t.color.ink3};
  text-transform: uppercase;
  font-weight: 600;
  margin-top: 4px;
`;

const Link = styled.a`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.accent};
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  margin-top: 8px;
  display: inline-block;

  &:hover {
    color: ${t.color.accentHover};
  }

  &::after {
    content: " →";
  }
`;

const SignalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, 1fr);
  gap: 8px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const SignalCard = styled.div`
  background: ${t.color.canvas};
  padding: 10px 12px;
  border-radius: ${t.radius.md};
`;

const SignalHead = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wide};
  text-transform: uppercase;
  color: ${t.color.ink3};
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SignalValue = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 14px;
  font-weight: 600;
  color: ${({ $sign }) =>
    $sign === "up" ? t.color.positive : $sign === "down" ? t.color.negative : t.color.ink};
`;

const EmptyState = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  color: ${t.color.ink3};
  font-style: italic;
  padding: 12px 0;
`;

function fmtNetImpact(n) {
  if (n == null || n === 0) return "Neutral";
  const v = Number(n);
  const prefix = v < 0 ? "-" : "+";
  if (Math.abs(v) >= 1e6) return `${prefix}$${(Math.abs(v) / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${prefix}$${Math.round(Math.abs(v) / 1e3)}K`;
  return `${prefix}$${Math.round(Math.abs(v))}`;
}

function netDirection(n) {
  if (n == null || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

function netLabel(n) {
  if (n == null || n === 0) return "Net market effect";
  return n > 0 ? "Net market tailwind" : "Net market headwind";
}

export function MarketOverlayBanner({ data, onOpenMarketContext }) {
  if (!data || !data.applied) {
    return (
      <Banner>
        <Eyebrow>● Market Overlay · Not Applied</Eyebrow>
        <Headline>No market signals adjust this plan.</Headline>
        <EmptyState>
          Upload events, cost trends, or competitive data to see how market
          context shifts the recommendation.
        </EmptyState>
      </Banner>
    );
  }

  const { net_impact, signals_count = 0, signals = [] } = data;
  const cols = Math.min(Math.max(signals.length, 1), 4);

  return (
    <Banner>
      <Head>
        <HeadLeft>
          <Eyebrow>● Market Overlay · Applied</Eyebrow>
          <Headline>
            Current market conditions adjust the recommended plan impact.
          </Headline>
          <Sub>
            {signals_count} signal{signals_count === 1 ? "" : "s"} applied
          </Sub>
          {onOpenMarketContext && (
            <Link onClick={onOpenMarketContext}>Open Market Context</Link>
          )}
        </HeadLeft>
        <HeadRight>
          <NetImpact $sign={netDirection(net_impact)}>
            {fmtNetImpact(net_impact)}
          </NetImpact>
          <NetImpactLabel>{netLabel(net_impact)}</NetImpactLabel>
        </HeadRight>
      </Head>

      <SignalsGrid $cols={cols}>
        {signals.slice(0, 4).map((sig, i) => (
          <SignalCard key={`${sig.label}-${i}`}>
            <SignalHead>{sig.label}</SignalHead>
            <SignalValue $sign={sig.direction}>{sig.value_text}</SignalValue>
          </SignalCard>
        ))}
      </SignalsGrid>
    </Banner>
  );
}

export default MarketOverlayBanner;
