import { useState, useEffect } from "react";
import styled from "styled-components";
import { t } from "./tokens.js";
import { login, fetchDemoUsers, getStoredAuth } from "./api.js";

/**
 * LoginV2 — v5 mockup-matched sign-in screen.
 *
 * Two-column layout:
 *   Left (canvas, ~50%): MarketLens wordmark + big serif headline
 *     ("Marketing ROI, defensible in the boardroom.") + body copy +
 *     3 feature highlights with pillar-accent icon squares.
 *   Right (surface, ~50%): signin card with email/password form,
 *     Forgot password link, Sign in button, OR divider, SSO buttons
 *     (EY SSO + Microsoft), "New to MarketLens? Request access →",
 *     and compliance chips (SOC 2 · EU/IN data residency).
 *
 * On successful login, redirects to /v2 (v25 client) rather than /
 * (v24 client). Keeps the two surfaces fully separate during parallel
 * deployment — a user who authenticated on the v2 login page stays in
 * the v2 app.
 *
 * Business logic reuses the same api.js login / getStoredAuth helpers
 * as v24 LoginScreen — same JWT auth, same role persistence, same error
 * handling. Only the visual surface and the post-login redirect differ.
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

const Page = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: ${t.color.canvas};
  font-family: ${t.fontV2.body};
  color: ${t.color.ink};

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const BrandPane = styled.div`
  padding: 64px 72px 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: ${t.color.canvas};

  @media (max-width: 960px) {
    padding: 36px 28px 20px;
    min-height: auto;
  }
`;

const SigninPane = styled.div`
  padding: 64px 72px 48px;
  background: ${t.color.sunken};
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 960px) {
    padding: 28px;
  }
`;

const Wordmark = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 22px;
  font-weight: 700;
  color: ${t.color.ink};
  margin-bottom: 64px;

  em {
    color: ${t.color.accent};
    font-style: normal;
  }

  @media (max-width: 960px) {
    margin-bottom: 28px;
  }
`;

const HeroHeadline = styled.h1`
  font-family: ${t.fontV2.headline};
  font-size: 56px;
  font-weight: 600;
  line-height: 1.1;
  margin: 0 0 24px 0;
  letter-spacing: -0.8px;
  max-width: 560px;
  color: ${t.color.ink};

  em {
    font-style: italic;
    color: ${t.color.accent};
  }

  @media (max-width: 1200px) {
    font-size: 44px;
  }

  @media (max-width: 960px) {
    font-size: 32px;
  }
`;

const HeroBody = styled.p`
  font-family: ${t.fontV2.body};
  font-size: 15px;
  line-height: 1.55;
  color: ${t.color.ink2};
  max-width: 520px;
  margin: 0 0 48px 0;

  @media (max-width: 960px) {
    font-size: 14px;
    margin-bottom: 28px;
  }
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 540px;

  @media (max-width: 960px) {
    display: none;
  }
`;

const FeatureRow = styled.div`
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 16px;
  align-items: start;
`;

const FeatureIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${t.radius.md};
  background: ${({ $pillar }) => PILLAR_SOFT[$pillar] || t.color.sunken};
  color: ${({ $pillar }) => PILLAR_ACCENT[$pillar] || t.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${t.fontV2.headline};
  font-weight: 600;
  font-size: 15px;
`;

const FeatureTitle = styled.div`
  font-family: ${t.fontV2.body};
  font-weight: 700;
  font-size: 14px;
  color: ${t.color.ink};
  margin-bottom: 2px;
`;

const FeatureBody = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  line-height: 1.5;
  color: ${t.color.ink2};
`;

const Footer = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  color: ${t.color.ink3};
  border-top: 1px solid ${t.color.border};
  padding-top: 18px;
  margin-top: 40px;

  @media (max-width: 960px) {
    margin-top: 20px;
    padding-top: 14px;
  }
`;

const SigninCard = styled.div`
  width: 100%;
  max-width: 420px;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.xl};
  padding: 36px 36px 28px;
  box-shadow: ${t.shadow.card};

  @media (max-width: 960px) {
    padding: 28px 24px;
  }
`;

const CardHeadline = styled.h2`
  font-family: ${t.fontV2.headline};
  font-size: 26px;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: ${t.color.ink};
`;

const CardSub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink2};
  margin-bottom: 24px;
`;

const FieldLabel = styled.label`
  display: block;
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  text-transform: uppercase;
  color: ${t.color.ink3};
  margin-bottom: 6px;
  margin-top: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 11px 14px;
  border: 1px solid ${t.color.border};
  background: ${t.color.canvas};
  border-radius: ${t.radius.md};
  font-family: ${t.fontV2.body};
  font-size: 14px;
  color: ${t.color.ink};
  outline: none;
  transition: border-color ${t.motion.base} ${t.motion.ease};

  &:focus {
    border-color: ${t.color.accent};
    background: ${t.color.surface};
  }

  &::placeholder {
    color: ${t.color.ink4};
  }
`;

const ForgotRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
`;

const ForgotLink = styled.a`
  font-family: ${t.fontV2.body};
  font-size: 12px;
  font-weight: 600;
  color: ${t.color.accent};
  text-decoration: none;
  cursor: pointer;

  &:hover {
    color: ${t.color.accentHover};
  }
`;

const PrimaryBtn = styled.button`
  width: 100%;
  background: ${t.color.accent};
  color: white;
  padding: 12px 16px;
  border: 1px solid ${t.color.accent};
  border-radius: ${t.radius.md};
  font-family: ${t.fontV2.body};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
  transition: background ${t.motion.base} ${t.motion.ease};

  &:hover:not(:disabled) {
    background: ${t.color.accentHover};
    border-color: ${t.color.accentHover};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Divider = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  margin: 20px 0 14px;
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink4};
  text-transform: uppercase;

  &::before,
  &::after {
    content: "";
    border-top: 1px solid ${t.color.border};
  }
`;

const SsoBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: ${t.color.surface};
  color: ${t.color.ink};
  padding: 11px 14px;
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.md};
  font-family: ${t.fontV2.body};
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 8px;
  transition: border-color ${t.motion.base} ${t.motion.ease};

  &:hover {
    border-color: ${t.color.borderStrong};
    background: ${t.color.canvas};
  }
`;

const SsoIcon = styled.span`
  font-size: 14px;
  color: ${t.color.ink2};
`;

const RequestRow = styled.div`
  text-align: center;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid ${t.color.border};
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  color: ${t.color.ink3};
`;

const RequestLink = styled.a`
  color: ${t.color.accent};
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;

  &::after {
    content: " →";
  }

  &:hover {
    color: ${t.color.accentHover};
  }
`;

const ChipRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
`;

const ComplianceChip = styled.span`
  display: inline-block;
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  border-radius: 10px;
  background: ${t.color.pillarRevSoft};
  color: ${t.color.pillarRev};

  &::before {
    content: "● ";
  }
`;

const ErrorMessage = styled.div`
  margin-top: 14px;
  padding: 10px 14px;
  background: ${t.color.negativeBg};
  border: 1px solid ${t.color.negative};
  border-radius: ${t.radius.md};
  color: ${t.color.negative};
  font-family: ${t.fontV2.body};
  font-size: 12.5px;
  line-height: 1.4;
`;

const DemoHint = styled.div`
  margin-top: 18px;
  padding: 12px 14px;
  background: ${t.color.accentSub};
  border-radius: ${t.radius.md};
  font-family: ${t.fontV2.body};
  font-size: 11.5px;
  line-height: 1.5;
  color: ${t.color.accentInk};

  strong {
    font-weight: 700;
  }

  code {
    background: ${t.color.surface};
    padding: 1px 6px;
    border-radius: 3px;
    font-family: ${t.font.mono};
    font-size: 11px;
    color: ${t.color.ink};
  }
`;

// v5 Post-login redirect target. Different from v24 LoginScreen which
// sends client → "/". Here we send to /v2 so the user stays in the v25
// surface they authenticated from.
function redirectByRole(role) {
  if (role === "editor" || role === "admin") {
    window.location.href = "/editor";
  } else {
    window.location.href = "/v2";
  }
}

export default function LoginV2() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.role) redirectByRole(auth.role);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await fetchDemoUsers();
        if (data?.demo_users) setDemoUsers(data.demo_users);
      } catch (e) {
        // Silently ignore — demo user list is a nice-to-have
      }
    })();
  }, []);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    const { data, error } = await login(username.trim(), password);
    setSubmitting(false);
    if (data) {
      redirectByRole(data.role);
    } else {
      setErrorMsg(
        error?.message === "Invalid username or password"
          ? "Email or password didn't match. Please try again."
          : error?.message || "Sign in failed. Please try again."
      );
    }
  }

  function handleSso(provider) {
    setErrorMsg(
      `${provider} SSO is not yet wired in this environment. ` +
        "For the demo, use the email/password form above — try demo / demo1234."
    );
  }

  const hasDemoCreds = demoUsers && demoUsers.length > 0;

  return (
    <Page>
      {/* LEFT pane: brand + hero + feature list */}
      <BrandPane>
        <div>
          <Wordmark>
            MarketLens<em>.</em>
          </Wordmark>
          <HeroHeadline>
            Marketing ROI, <em>defensible in the boardroom.</em>
          </HeroHeadline>
          <HeroBody>
            Bayesian MMM · scenario-first workflow · honest confidence on every
            recommendation. Built to quantify revenue leakage, avoidable cost,
            and experience drop — across channels, in one place.
          </HeroBody>
          <FeatureList>
            <FeatureRow>
              <FeatureIcon $pillar="revenue_uplift">$</FeatureIcon>
              <div>
                <FeatureTitle>Three-pillar value framework</FeatureTitle>
                <FeatureBody>
                  Revenue Uplift · Cost Reduction · CX Uplift — every opportunity
                  classified by what it improves.
                </FeatureBody>
              </div>
            </FeatureRow>
            <FeatureRow>
              <FeatureIcon $pillar="cost_reduction">∿</FeatureIcon>
              <div>
                <FeatureTitle>Bayesian methodology, auditable outputs</FeatureTitle>
                <FeatureBody>
                  90% HDI bands on every estimate. Every recommendation names its
                  model and confidence tier.
                </FeatureBody>
              </div>
            </FeatureRow>
            <FeatureRow>
              <FeatureIcon $pillar="cx_uplift">⇌</FeatureIcon>
              <div>
                <FeatureTitle>Scenario-first decision surface</FeatureTitle>
                <FeatureBody>
                  Compare baseline, recommended, and aggressive plans against a
                  shared market overlay.
                </FeatureBody>
              </div>
            </FeatureRow>
          </FeatureList>
        </div>
        <Footer>
          An EY Customer Experience platform · built for Partner-led pursuits
        </Footer>
      </BrandPane>

      {/* RIGHT pane: signin card */}
      <SigninPane>
        <SigninCard>
          <CardHeadline>Welcome back</CardHeadline>
          <CardSub>Sign in to continue to your engagement</CardSub>

          <form onSubmit={handleSubmit}>
            <FieldLabel htmlFor="email-input">Email</FieldLabel>
            <Input
              id="email-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="name@ey.com"
              autoComplete="username"
              disabled={submitting}
            />

            <FieldLabel htmlFor="password-input">Password</FieldLabel>
            <Input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
              disabled={submitting}
            />

            <ForgotRow>
              <ForgotLink
                onClick={(e) => {
                  e.preventDefault();
                  alert("Password reset flow not wired in this environment.");
                }}
              >
                Forgot password?
              </ForgotLink>
            </ForgotRow>

            <PrimaryBtn type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </PrimaryBtn>
          </form>

          {errorMsg && <ErrorMessage>{errorMsg}</ErrorMessage>}

          <Divider>OR</Divider>

          <SsoBtn type="button" onClick={() => handleSso("EY")}>
            <SsoIcon>⚡</SsoIcon>
            Continue with EY SSO
          </SsoBtn>
          <SsoBtn type="button" onClick={() => handleSso("Microsoft")}>
            <SsoIcon>◈</SsoIcon>
            Continue with Microsoft
          </SsoBtn>

          <RequestRow>
            New to MarketLens?{" "}
            <RequestLink
              onClick={(e) => {
                e.preventDefault();
                alert(
                  "Request access flow not wired in this environment. " +
                    "Contact your engagement lead."
                );
              }}
            >
              Request access
            </RequestLink>
            <ChipRow>
              <ComplianceChip>SOC 2</ComplianceChip>
              <ComplianceChip>EU/IN data residency</ComplianceChip>
            </ChipRow>
          </RequestRow>

          {hasDemoCreds && (
            <DemoHint>
              <strong>Demo access:</strong> email <code>demo</code>, password{" "}
              <code>demo1234</code>. For the pitch walkthrough only.
            </DemoHint>
          )}
        </SigninCard>
      </SigninPane>
    </Page>
  );
}
