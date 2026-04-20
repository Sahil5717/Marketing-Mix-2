import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * MarketContextTile — left card on the Diagnosis bottom split row.
 *
 * Summarizes upcoming events + top cost alert, with "Open Market Context →"
 * link in the top-right for the full screen.
 *
 * Props:
 *   data — { events_count, upcoming_events: [{name, when, impact_pct, direction}],
 *            cost_alerts_count, top_alert: {title, body} | null }
 *   onOpenMarketContext — click handler for the link
 */

const Tile = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  padding: 22px 24px;
`;

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 14px;
`;

const Title = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
`;

const Link = styled.a`
  font-family: ${t.fontV2.body};
  font-size: 11px;
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

const SectionTitle = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wide};
  color: ${t.color.ink};
  text-transform: uppercase;
  margin-bottom: 10px;
  margin-top: 4px;
`;

const SectionCount = styled.span`
  color: ${t.color.ink3};
  font-weight: 500;
  margin-left: 4px;
`;

const EventRow = styled.div`
  display: grid;
  grid-template-columns: 18px 1fr 110px;
  align-items: center;
  padding: 7px 0;
  gap: 8px;
`;

const Dot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $dir }) => ($dir === "up" ? t.color.positive : t.color.negative)};
`;

const EventName = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const EventWhen = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};
  margin-top: 1px;
`;

const EventImpact = styled.div`
  text-align: right;
  font-family: ${t.fontV2.headline};
  font-size: 13px;
  font-weight: 600;
  color: ${({ $dir }) => ($dir === "up" ? t.color.positive : t.color.negative)};
`;

const Alert = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${t.color.border};
`;

const AlertTitle = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  font-weight: 600;
  color: ${t.color.ink};
  margin-bottom: 6px;
`;

const AlertBody = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11.5px;
  color: ${t.color.ink2};
  line-height: 1.45;
`;

const Footer = styled.div`
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid ${t.color.border};
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};
`;

function formatImpactPct(pct) {
  if (pct > 0) return `+${Math.round(pct)}% expected`;
  return `${Math.round(pct)}% expected`;
}

export function MarketContextTile({ data, onOpenMarketContext }) {
  if (!data) return null;
  const {
    events_count = 0,
    upcoming_events = [],
    cost_alerts_count = 0,
    top_alert,
  } = data;

  return (
    <Tile>
      <Head>
        <Title>Market Context</Title>
        {onOpenMarketContext && (
          <Link onClick={onOpenMarketContext}>Open Market Context</Link>
        )}
      </Head>

      <SectionTitle>
        Upcoming events <SectionCount>· {events_count}</SectionCount>
      </SectionTitle>

      {upcoming_events.map((ev, i) => (
        <EventRow key={`${ev.name}-${i}`}>
          <Dot $dir={ev.direction} />
          <div>
            <EventName>{ev.name}</EventName>
            <EventWhen>{ev.when}</EventWhen>
          </div>
          <EventImpact $dir={ev.direction}>{formatImpactPct(ev.impact_pct)}</EventImpact>
        </EventRow>
      ))}

      {top_alert && (
        <Alert>
          <AlertTitle>{top_alert.title}</AlertTitle>
          <AlertBody>{top_alert.body}</AlertBody>
        </Alert>
      )}

      <Footer>
        Context loaded: events, trends · {cost_alerts_count} cost alert
        {cost_alerts_count === 1 ? "" : "s"}
      </Footer>
    </Tile>
  );
}

export default MarketContextTile;
