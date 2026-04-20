import { useEffect, useState } from "react";
import styled from "styled-components";
import { t } from "./tokens.js";
import { AppHeader } from "./ui/AppHeader.jsx";
import {
  KpiTile,
  MarketEventRow,
} from "./ui/v2";

/**
 * MarketContextV2 — the redesigned Market Context screen (v5 mockup match).
 *
 * Data source: /api/v2/market-context
 *
 * Structure:
 *   1. AppHeader (Market tab active)
 *   2. Eyebrow + serif headline with signal count + net market effect
 *   3. Reviewer line
 *   4. 5-tile KPI strip
 *   5. Two-column main row:
 *      - LEFT: Upcoming events timeline (MarketEventRow list)
 *      - RIGHT: Cost trend alerts sidebar
 *   6. Competitive activity full-width section
 *   7. Upload CTA banner (conditional — hidden if all 3 data sources loaded)
 *   8. Bottom split row: "How these signals shape the Plan" + "Where signals surface"
 *
 * The market screen is the "explanation" layer — it shows WHY the plan
 * looks the way it does. Every element connects back to Plan or Diagnosis.
 */

const Canvas = styled.div`
  background: ${t.color.canvas};
  min-height: 100vh;
  font-family: ${t.fontV2.body};
  color: ${t.color.ink};
`;

const Page = styled.main`
  max-width: ${t.layout.maxWidth};
  margin: 0 auto;
  padding: 28px ${t.layout.pad.wide} 80px;

  @media (max-width: ${t.layout.bp.narrow}) {
    padding: 24px ${t.layout.pad.narrow} 60px;
  }
`;

const Eyebrow = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.accent};
  text-transform: uppercase;
  margin-bottom: 10px;
`;

const EyebrowSub = styled.span`
  color: ${t.color.ink3};
  font-weight: 500;
  margin-left: 8px;
`;

const Headline = styled.h1`
  font-family: ${t.fontV2.headline};
  font-size: 32px;
  font-weight: 600;
  line-height: 1.22;
  color: ${t.color.ink};
  margin: 0 0 12px 0;
  max-width: 940px;

  em {
    font-style: italic;
    color: ${t.color.accent};
  }
`;

const Reviewer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink2};
  margin-bottom: 18px;

  strong { color: ${t.color.ink}; font-weight: 600; }
`;

const Avatar = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${t.color.accent};
  color: white;
  font-weight: 600;
  font-size: 11px;
`;

const KpiStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 8px;
  margin-bottom: 30px;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 30px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr;
  }
`;

const SectionCard = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  padding: 24px 28px 20px;
`;

const SectionHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
`;

const SectionTitle = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 20px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const SectionSub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10.5px;
  color: ${t.color.ink3};
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wide};
  margin-bottom: 12px;
`;

const RightLink = styled.a`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.accent};
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  &::after { content: " →"; }
  &:hover { color: ${t.color.accentHover}; }
`;

const CostAlertRow = styled.div`
  padding: 14px 0;
  border-top: 1px solid ${({ $first }) => ($first ? "transparent" : t.color.border)};
`;

const CostAlertHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
  gap: 10px;
`;

const CostAlertName = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const CostAlertChange = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 14px;
  font-weight: 600;
  color: ${({ $direction }) =>
    $direction === "up" ? t.color.negative :
    $direction === "down" ? t.color.positive :
    t.color.ink};
  white-space: nowrap;
`;

const CostAlertBody = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11.5px;
  color: ${t.color.ink2};
  line-height: 1.45;
  margin-bottom: 6px;
`;

const CostAlertLink = styled.a`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.accent};
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  &::after { content: " →"; }
`;

const CompetitiveCard = styled(SectionCard)`
  margin-bottom: 26px;
`;

const CompetitiveRow = styled.div`
  display: grid;
  grid-template-columns: 44px 1fr 180px;
  gap: 14px;
  padding: 14px 0;
  border-top: 1px solid ${({ $first }) => ($first ? "transparent" : t.color.border)};
  align-items: center;
`;

const CompAvatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${t.color.canvas};
  border: 1px solid ${t.color.border};
  font-family: ${t.fontV2.body};
  font-weight: 700;
  font-size: 13px;
  color: ${t.color.ink2};
`;

const CompLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 14px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const CompDescription = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink2};
  margin-top: 3px;
  line-height: 1.4;
`;

const SOVBlock = styled.div`
  display: grid;
  grid-template-columns: 1fr 42px;
  gap: 8px;
  align-items: center;
`;

const SOVBarWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SOVLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${t.color.ink3};
`;

const SOVBarTrack = styled.div`
  height: 6px;
  background: ${t.color.canvas};
  border-radius: 3px;
  overflow: hidden;
`;

const SOVBarFill = styled.div`
  height: 100%;
  background: ${({ $tone }) =>
    $tone === "warning" ? t.color.negative :
    $tone === "positive" ? t.color.positive :
    t.color.neutral};
  width: ${({ $pct }) => `${$pct}%`};
  border-radius: 3px;
`;

const SOVValue = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 14px;
  font-weight: 600;
  color: ${t.color.ink};
  text-align: right;
`;

const UploadBanner = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-left: 3px solid ${t.color.accent};
  border-radius: ${t.radius.lg};
  padding: 20px 24px;
  margin-bottom: 26px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
`;

const UploadText = styled.div``;

const UploadEyebrow = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.accent};
  text-transform: uppercase;
  margin-bottom: 6px;
  &::before { content: "● "; }
`;

const UploadHeadline = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 16px;
  font-weight: 600;
  color: ${t.color.ink};
  margin-bottom: 4px;
`;

const UploadSub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink3};
`;

const UploadBtn = styled.button`
  background: ${t.color.accent};
  color: white;
  padding: 10px 18px;
  border: 1px solid ${t.color.accent};
  border-radius: ${t.radius.md};
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  &::after { content: " →"; }
  &:hover { background: ${t.color.accentHover}; border-color: ${t.color.accentHover}; }
`;

const SplitRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr;
  }
`;

const RelatedTile = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  padding: 22px 24px;
`;

const RelatedLink = styled.a`
  position: absolute;
  top: 20px;
  right: 24px;
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.accent};
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  &::after { content: " →"; }
`;

const RelatedEyebrow = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
  margin-bottom: 10px;
`;

const RelatedHeadline = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 17px;
  font-weight: 600;
  color: ${t.color.ink};
  margin-bottom: 6px;
  padding-right: 140px;
`;

const RelatedBody = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  color: ${t.color.ink2};
  line-height: 1.5;
`;

const LoadingPane = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: ${t.color.ink3};
  font-family: ${t.fontV2.body};
  font-size: 14px;
`;

const ErrorPane = styled.div`
  margin-top: 24px;
  padding: 20px 24px;
  background: ${t.color.negativeBg};
  border: 1px solid ${t.color.negative};
  border-radius: ${t.radius.lg};
  color: ${t.color.negative};
  font-family: ${t.fontV2.body};
  font-size: 13px;
`;

function initials(name) {
  if (!name) return "??";
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatCurrencyMSigned(v) {
  if (v == null) return "—";
  const n = Number(v) || 0;
  const sign = n >= 0 ? "+" : "−";
  const abs = Math.abs(n);
  // Prefer M-notation to match the mockup style consistently, even for
  // values under 1M (e.g. −$0.8M reads cleaner than −$820K in hero copy).
  if (abs >= 1e5) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function formatKpiValue(k) {
  const v = k.value;
  if (v == null) return "—";
  if (k.format === "integer") return String(v);
  if (k.format === "hours") return String(v);
  if (k.format === "currency_m_signed") return formatCurrencyMSigned(v);
  return String(v);
}

function formatKpiUnit(k) {
  if (k.format === "hours") return "h";
  return "";
}

export default function MarketContextV2({ onNavigate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch("/api/v2/market-context")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  const go = (screen, params = {}) => {
    if (onNavigate) onNavigate(screen, params);
    else {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", screen);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
      window.location.href = url.toString();
    }
  };

  if (err) {
    return (
      <Canvas>
        <AppHeader currentScreen="market" v2Mode />
        <Page>
          <ErrorPane>
            Could not load market context: {err}
          </ErrorPane>
        </Page>
      </Canvas>
    );
  }

  if (!data) {
    return (
      <Canvas>
        <AppHeader currentScreen="market" v2Mode />
        <Page>
          <LoadingPane>Loading Market Context…</LoadingPane>
        </Page>
      </Canvas>
    );
  }

  const { hero, kpis, events, cost_alerts, competitive, upload_cta_visible, reviewer } = data;

  const signalsPhrase = `${hero.signals_count} signal${hero.signals_count === 1 ? "" : "s"}`;
  const netPhrase = formatCurrencyMSigned(hero.net_market_effect);
  const headline = `<em>${signalsPhrase}</em> applied to the ${hero.period_label} plan — net market effect <em>${netPhrase}</em>.`;

  return (
    <Canvas>
      <AppHeader
        currentScreen="market"
        v2Mode
        engagementMeta={{ client: "Acme Retail", period: hero.period_label }}
      />
      <Page>
        <Eyebrow>
          Market Context
          <EyebrowSub>· signals feeding the plan</EyebrowSub>
        </Eyebrow>
        <Headline dangerouslySetInnerHTML={{ __html: headline }} />

        {reviewer && (
          <Reviewer>
            <Avatar>{initials(reviewer.name)}</Avatar>
            <span>
              Loaded by <strong>{reviewer.name}</strong>, {reviewer.role} · {reviewer.signals_summary}
            </span>
          </Reviewer>
        )}

        <KpiStrip>
          {kpis.map((k) => (
            <KpiTile
              key={k.label}
              label={k.label}
              value={formatKpiValue(k)}
              unit={formatKpiUnit(k)}
              sub={k.sub}
            />
          ))}
        </KpiStrip>

        <TwoCol>
          {/* Events timeline */}
          <SectionCard>
            <SectionHead>
              <div>
                <SectionTitle>Upcoming events</SectionTitle>
                <SectionSub>
                  {events.length} events in next 90 days · affects baseline demand · color = direction
                </SectionSub>
              </div>
              <RightLink onClick={() => alert("Manage events (pending)")}>Manage events</RightLink>
            </SectionHead>
            {events.length === 0 ? (
              <div style={{
                padding: 30, textAlign: "center", color: t.color.ink3,
                fontSize: 13, fontStyle: "italic",
              }}>
                No upcoming events loaded.
              </div>
            ) : (
              events.map((ev, idx) => (
                <MarketEventRow
                  key={`${ev.name}-${idx}`}
                  event={ev}
                  isFirst={idx === 0}
                />
              ))
            )}
          </SectionCard>

          {/* Cost trend alerts sidebar */}
          <SectionCard>
            <SectionHead>
              <div>
                <SectionTitle>Cost trend alerts</SectionTitle>
                <SectionSub>changes in unit costs vs baseline</SectionSub>
              </div>
              <RightLink onClick={() => alert("All alerts (pending)")}>All alerts</RightLink>
            </SectionHead>
            {cost_alerts.length === 0 ? (
              <div style={{
                padding: 20, color: t.color.ink3, fontSize: 13, fontStyle: "italic",
              }}>
                No cost trend alerts.
              </div>
            ) : (
              cost_alerts.map((alert, idx) => {
                const pctSigned =
                  alert.yoy_change_pct > 0
                    ? `+${Math.round(alert.yoy_change_pct)}%`
                    : `${Math.round(alert.yoy_change_pct)}%`;
                return (
                  <CostAlertRow key={`${alert.channel}-${idx}`} $first={idx === 0}>
                    <CostAlertHead>
                      <CostAlertName>
                        {alert.channel} {alert.metric} {alert.direction === "up" ? "up" : alert.direction === "down" ? "down" : "stable"}{" "}
                        {Math.abs(alert.yoy_change_pct) >= 1 ? `${Math.abs(alert.yoy_change_pct).toFixed(0)}% YoY` : ""}
                      </CostAlertName>
                      <CostAlertChange $direction={alert.direction}>{pctSigned}</CostAlertChange>
                    </CostAlertHead>
                    <CostAlertBody>{alert.explanation}</CostAlertBody>
                    {alert.pillar_link && (
                      <CostAlertLink onClick={() => go("plan")}>See in Plan</CostAlertLink>
                    )}
                  </CostAlertRow>
                );
              })
            )}
          </SectionCard>
        </TwoCol>

        {/* Competitive activity full width */}
        {competitive.length > 0 && (
          <CompetitiveCard>
            <SectionHead>
              <div>
                <SectionTitle>Competitive activity</SectionTitle>
                <SectionSub>
                  share of voice across {competitive.length} pressured channel{competitive.length === 1 ? "" : "s"} · last 30 days
                </SectionSub>
              </div>
              <RightLink onClick={() => alert("Manage competitive set (pending)")}>Manage competitive set</RightLink>
            </SectionHead>
            {competitive.map((comp, idx) => (
              <CompetitiveRow key={`${comp.label}-${idx}`} $first={idx === 0}>
                <CompAvatar>{comp.name}</CompAvatar>
                <div>
                  <CompLabel>{comp.label}</CompLabel>
                  <CompDescription>{comp.description}</CompDescription>
                </div>
                <SOVBlock>
                  <SOVBarWrap>
                    <SOVLabel>Share of voice</SOVLabel>
                    <SOVBarTrack>
                      <SOVBarFill $pct={comp.share_of_voice_pct} $tone={comp.tone} />
                    </SOVBarTrack>
                  </SOVBarWrap>
                  <SOVValue>{comp.share_of_voice_pct}%</SOVValue>
                </SOVBlock>
              </CompetitiveRow>
            ))}
          </CompetitiveCard>
        )}

        {/* Upload CTA (conditional) */}
        {upload_cta_visible && (
          <UploadBanner>
            <UploadText>
              <UploadEyebrow>Add more signals</UploadEyebrow>
              <UploadHeadline>Upload custom events, pricing changes, or competitive intel</UploadHeadline>
              <UploadSub>CSV · 4 columns: event name, type, window, expected impact · template provided</UploadSub>
            </UploadText>
            <UploadBtn onClick={() => alert("Upload flow not wired for pitch")}>Upload CSV</UploadBtn>
          </UploadBanner>
        )}

        {/* Bottom split row */}
        <SplitRow>
          <RelatedTile>
            <RelatedLink onClick={() => go("plan")}>Open Plan</RelatedLink>
            <RelatedEyebrow>How these signals shape the Plan</RelatedEyebrow>
            <RelatedHeadline>
              Market overlay applied · net {formatCurrencyMSigned(hero.net_market_effect)} absorbed
            </RelatedHeadline>
            <RelatedBody>
              Events, cost trends, and competitive signals flow directly into the Recommended plan.
              Every move in Plan accounts for market conditions.
            </RelatedBody>
          </RelatedTile>
          <RelatedTile>
            <RelatedLink onClick={() => go("diagnosis")}>Back to Diagnosis</RelatedLink>
            <RelatedEyebrow>Where signals surface as decisions</RelatedEyebrow>
            <RelatedHeadline>
              Events drive {hero.events_count} of the opportunities
            </RelatedHeadline>
            <RelatedBody>
              Diwali window powers the Events scale-up. Competitor IPL and CPC trends feed
              Cost Reduction and CX alerts in Diagnosis.
            </RelatedBody>
          </RelatedTile>
        </SplitRow>
      </Page>
    </Canvas>
  );
}
