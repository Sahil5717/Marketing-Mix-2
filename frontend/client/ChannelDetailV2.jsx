import { useEffect, useState } from "react";
import styled from "styled-components";
import { t } from "./tokens.js";
import { AppHeader } from "./ui/AppHeader.jsx";
import {
  KpiTile,
  ResponseCurveChart,
  ChannelVitals,
  ChannelRecommendationRow,
} from "./ui/v2";

/**
 * ChannelDetailV2 — the redesigned Channel Detail screen (v5 mockup match).
 *
 * Data source: /api/v2/channel/{channel}
 *
 * Structure:
 *   1. AppHeader (Channels tab active)
 *   2. Breadcrumb + eyebrow + serif headline w/ pillar pills + reviewer line
 *   3. 5-tile KPI strip (Revenue impact · Cost saving · CX effect · ROAS · CPC trend)
 *   4. Main row: ResponseCurveChart (66%) + ChannelVitals sidebar (34%)
 *   5. Recommendations section — 1 row per pillar this channel participates in
 *   6. Bottom split row: Back to Diagnosis + Open Market Context
 */

const PILLAR_ACCENT = {
  revenue_uplift: t.color.pillarRev,
  cost_reduction: t.color.pillarCost,
  cx_uplift: t.color.pillarCx,
};
const PILLAR_SOFT = {
  revenue_uplift: t.color.pillarRevSoft,
  cost_reduction: t.color.pillarCostSoft,
  cx_uplift: t.color.pillarCxSoft,
};
const PILLAR_LABEL = {
  revenue_uplift: "Revenue Uplift",
  cost_reduction: "Cost Reduction",
  cx_uplift: "CX Uplift",
};

const Canvas = styled.div`
  background: ${t.color.canvas};
  min-height: 100vh;
  font-family: ${t.fontV2.body};
  color: ${t.color.ink};
`;

const Page = styled.main`
  max-width: ${t.layout.maxWidth};
  margin: 0 auto;
  padding: 24px ${t.layout.pad.wide} 80px;

  @media (max-width: ${t.layout.bp.narrow}) {
    padding: 20px ${t.layout.pad.narrow} 60px;
  }
`;

const Breadcrumb = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink3};
  margin-bottom: 10px;

  a {
    color: ${t.color.accent};
    text-decoration: none;
    cursor: pointer;
    font-weight: 600;

    &:hover { color: ${t.color.accentHover}; }
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

const Headline = styled.h1`
  font-family: ${t.fontV2.headline};
  font-size: 34px;
  font-weight: 600;
  line-height: 1.2;
  color: ${t.color.ink};
  margin: 0 0 14px;
  max-width: 980px;

  em {
    font-style: italic;
    color: ${t.color.accent};
  }
`;

const PillarsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
`;

const PillarPill = styled.span`
  display: inline-block;
  font-family: ${t.fontV2.body};
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 5px 12px;
  border-radius: 11px;
  text-transform: uppercase;
  background: ${({ $pillar }) => PILLAR_SOFT[$pillar] || t.color.sunken};
  color: ${({ $pillar }) => PILLAR_ACCENT[$pillar] || t.color.ink2};
`;

const Reviewer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink2};
  margin-bottom: 18px;

  strong {
    color: ${t.color.ink};
    font-weight: 600;
  }
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
  font-family: ${t.fontV2.body};
  font-weight: 600;
  font-size: 11px;
`;

const KpiStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 8px;
  margin-bottom: 28px;
`;

const MainRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 30px;

  @media (max-width: ${t.layout.bp.narrow}) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  padding: 24px 28px 16px;
`;

const ChartTitle = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 17px;
  font-weight: 600;
  color: ${t.color.ink};
`;

const ChartSub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10.5px;
  color: ${t.color.ink3};
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wide};
`;

const ChartFooter = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11.5px;
  color: ${t.color.ink3};
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${t.color.border};
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;

  strong {
    color: ${t.color.ink2};
    font-weight: 600;
  }
`;

const RecsSection = styled.div`
  margin-bottom: 30px;
`;

const RecsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 14px;
`;

const RecsTitle = styled.h2`
  font-family: ${t.fontV2.headline};
  font-size: 20px;
  font-weight: 600;
  color: ${t.color.ink};
  margin: 0;
`;

const RecsSub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink3};
  margin-top: 3px;
`;

const RecsCount = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};
`;

const EmptyState = styled.div`
  padding: 32px;
  text-align: center;
  background: ${t.color.surface};
  border: 1px dashed ${t.color.border};
  border-radius: ${t.radius.lg};
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink3};
  font-style: italic;
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

const RelatedTitle = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
  margin-bottom: 12px;
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
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatCurrencyM(v) {
  if (v == null) return "—";
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function formatKpiValue(k) {
  const v = k.value;
  if (v == null) return "—";
  if (k.format === "currency_m") {
    if (v === 0) return "$0";
    const abs = Math.abs(v);
    if (abs >= 1e6) return `$${(abs / 1e6).toFixed(1)}`;
    if (abs >= 1e3) return `$${(abs / 1e3).toFixed(1)}`;
    return `$${Math.round(v)}`;
  }
  if (k.format === "multiple") return `${Number(v).toFixed(2)}`;
  if (k.format === "signed_pct") {
    const n = Number(v) || 0;
    return `${n > 0 ? "+" : ""}${n.toFixed(0)}%`;
  }
  return String(v);
}

function formatKpiUnit(k) {
  if (k.value == null || k.value === 0) return "";
  if (k.format === "currency_m") {
    const abs = Math.abs(k.value);
    if (abs >= 1e6) return "M";
    if (abs >= 1e3) return "K";
  }
  if (k.format === "multiple") return "×";
  return "";
}

export default function ChannelDetailV2({ onNavigate, channel }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  // Pull channel name from prop or URL param
  const channelKey = channel || (() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("channel") || "paid_search";
  })();

  useEffect(() => {
    setData(null);
    setErr(null);
    fetch(`/api/v2/channel/${encodeURIComponent(channelKey)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, [channelKey]);

  const go = (screen, params = {}) => {
    if (onNavigate) onNavigate(screen, params);
    else {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", screen);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      window.location.href = url.toString();
    }
  };

  if (err) {
    return (
      <Canvas>
        <AppHeader currentScreen="channels" v2Mode />
        <Page>
          <ErrorPane>
            Could not load channel detail: {err}. Try another channel, or make
            sure you've hit <code>/api/load-mock-data</code> and{" "}
            <code>/api/run-analysis</code>.
          </ErrorPane>
        </Page>
      </Canvas>
    );
  }

  if (!data) {
    return (
      <Canvas>
        <AppHeader currentScreen="channels" v2Mode />
        <Page>
          <LoadingPane>Loading channel detail…</LoadingPane>
        </Page>
      </Canvas>
    );
  }

  const { hero, kpis, response_curve, vitals, recommendations, reviewer } = data;

  // Compose hero headline dynamically based on which pillars are hit
  const pillarCount = hero.pillars_hit?.length || 0;
  let headline;
  if (pillarCount === 3) {
    headline = `${hero.channel} hits <em>all three pillars</em> — one channel, three decisions.`;
  } else if (pillarCount === 2) {
    headline = `${hero.channel} participates in <em>${pillarCount} pillars</em> — see recommendations below.`;
  } else if (pillarCount === 1) {
    const label = PILLAR_LABEL[hero.pillars_hit[0]].toLowerCase();
    headline = `${hero.channel} has a <em>${label}</em> opportunity this period.`;
  } else {
    headline = `${hero.channel} shows <em>no material moves</em> for the current period.`;
  }

  return (
    <Canvas>
      <AppHeader
        currentScreen="channels"
        v2Mode
        engagementMeta={{ client: "Acme Retail", period: "Q3 2026" }}
      />
      <Page>
        <Breadcrumb>
          <a onClick={() => go("diagnosis")}>← All channels</a>
          {" / "}
          {hero.channel}
        </Breadcrumb>

        <Eyebrow>
          Channel detail · {hero.share_of_spend_pct}% of total spend
        </Eyebrow>

        <Headline dangerouslySetInnerHTML={{ __html: headline }} />

        {hero.pillars_hit?.length > 0 && (
          <PillarsRow>
            {hero.pillars_hit.map((p) => (
              <PillarPill key={p} $pillar={p}>
                {PILLAR_LABEL[p]}
              </PillarPill>
            ))}
          </PillarsRow>
        )}

        {reviewer && (
          <Reviewer>
            <Avatar>{initials(reviewer.name)}</Avatar>
            <span>
              Reviewed by <strong>{reviewer.name}</strong>, {reviewer.role} ·{" "}
              {reviewer.weeks_of_data} weeks of data · Bayesian MMM R² {reviewer.model_r2}
            </span>
          </Reviewer>
        )}

        {/* 5-tile KPI strip */}
        <KpiStrip>
          {kpis.map((k, i) => (
            <KpiTile
              key={k.label}
              label={k.label}
              value={formatKpiValue(k)}
              unit={formatKpiUnit(k)}
              sub={k.sub}
              unavailable={k.value == null}
            />
          ))}
        </KpiStrip>

        {/* Response curve + vitals */}
        <MainRow>
          <ChartCard>
            <ChartTitle>Response curve · {hero.channel}</ChartTitle>
            <ChartSub>
              Model-fitted revenue vs spend · 90% HDI band · annualized
            </ChartSub>
            <ResponseCurveChart data={response_curve} />
            {response_curve && (
              <ChartFooter>
                <span>
                  <strong>Current:</strong> {formatCurrencyM(response_curve.current_spend)} · marginal ROAS{" "}
                  {response_curve.marginal_roas_current?.toFixed(1)}×
                </span>
                <span>
                  <strong>Recommended:</strong> {formatCurrencyM(response_curve.recommended_spend)} · marginal ROAS{" "}
                  {response_curve.marginal_roas_recommended?.toFixed(1)}×
                </span>
                <span>
                  <strong>Model R²:</strong> {response_curve.model_r2}
                </span>
              </ChartFooter>
            )}
          </ChartCard>
          <ChannelVitals
            data={vitals}
            onAllVitals={() => go("channels")}
          />
        </MainRow>

        {/* Recommendations */}
        <RecsSection>
          <RecsHeader>
            <div>
              <RecsTitle>Recommendations for {hero.channel}</RecsTitle>
              <RecsSub>
                One recommendation per pillar this channel participates in · click any
                row to see supporting evidence
              </RecsSub>
            </div>
            <RecsCount>
              {recommendations.length} of {recommendations.length} · ranked by impact
            </RecsCount>
          </RecsHeader>

          {recommendations.length === 0 ? (
            <EmptyState>
              No material recommendations for {hero.channel} in the current period.
              This channel is well-allocated across all three pillars.
            </EmptyState>
          ) : (
            recommendations.map((rec, idx) => (
              <ChannelRecommendationRow
                key={`${rec.pillar}-${idx}`}
                rec={rec}
                onClick={() => go(rec.pillar === "cx_uplift" ? "market" : "plan")}
              />
            ))
          )}
        </RecsSection>

        {/* Bottom split row */}
        <SplitRow>
          <RelatedTile>
            <RelatedLink onClick={() => go("diagnosis")}>Back to Diagnosis</RelatedLink>
            <RelatedTitle>Where this came from</RelatedTitle>
            <RelatedHeadline>Diagnosis identified this channel</RelatedHeadline>
            <RelatedBody>
              Every recommendation traces back to an opportunity surfaced on Diagnosis.
              Review pillar breakdown and methodology.
            </RelatedBody>
          </RelatedTile>
          <RelatedTile>
            <RelatedLink onClick={() => go("market")}>Open Market Context</RelatedLink>
            <RelatedTitle>What's affecting this channel</RelatedTitle>
            <RelatedHeadline>Market signals applied</RelatedHeadline>
            <RelatedBody>
              Cost trends, events, and competitive activity that impact this channel's
              response curve and recommendations.
            </RelatedBody>
          </RelatedTile>
        </SplitRow>
      </Page>
    </Canvas>
  );
}
