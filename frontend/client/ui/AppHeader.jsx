import styled, { css } from "styled-components";
import { t } from "../tokens.js";

/**
 * AppHeader — sticky top nav across all main app screens.
 *
 * Per mockup (marketlens-mockups.html) and handoff §5 (AppHeader spec):
 *   - 60px fixed height, sticks to top on scroll
 *   - Brand lockup on the far left: serif italic 'M' in accent + sans
 *     'MarketLens' wordmark
 *   - Center: horizontal nav with pill-style active state (dark fill)
 *   - Right: engagement metadata (client name · period) + Share button
 *   - Editor-mode variant: subtle amber tint on background + '✎ Editor
 *     mode' indicator
 *
 * Currently drives the ?screen= URL-param pattern for routing. When we
 * promote to client-side routing (post-v1), the `href` on NavItem becomes
 * a router Link, but the visual API stays the same.
 */

export function AppHeader({
  currentScreen = "diagnosis",
  auth,
  editorMode = false,
  engagementMeta,
  onSignOut,
  onShare,
}) {
  return (
    <HeaderBar $editor={editorMode}>
      <Inner>
        <BrandNav>
          <Brand href={editorMode ? "/editor" : "/"}>
            <BrandMark>M</BrandMark>
            <BrandWord>MarketLens</BrandWord>
          </Brand>

          <Nav>
            {editorMode && (
              <NavItem screen="hub" current={currentScreen} label="Workspace" />
            )}
            <NavItem screen="diagnosis" current={currentScreen} label="Diagnosis" />
            <NavItem screen="plan" current={currentScreen} label="Plan" />
            <NavItem screen="scenarios" current={currentScreen} label="Scenarios" />
            <NavItem screen="channels" current={currentScreen} label="Channels" />
          </Nav>
        </BrandNav>

        <MetaGroup>
          {editorMode && <EditorBadge>✎ Editor mode</EditorBadge>}
          {engagementMeta && (
            <Engagement>
              <strong>{engagementMeta.client}</strong>
              <Sep>·</Sep>
              <span>{engagementMeta.period}</span>
              {engagementMeta.updated && (
                <>
                  <VBar />
                  <span>Updated {engagementMeta.updated}</span>
                </>
              )}
            </Engagement>
          )}
          {onShare && <ShareButton onClick={onShare}>Share ↗</ShareButton>}
          {auth && <UserChip auth={auth} onSignOut={onSignOut} />}
        </MetaGroup>
      </Inner>
    </HeaderBar>
  );
}

function NavItem({ screen, current, label }) {
  const isActive = current === screen;
  return (
    <NavLink href={`?screen=${screen}`} $active={isActive}>
      {label}
    </NavLink>
  );
}

function UserChip({ auth, onSignOut }) {
  return (
    <UserChipWrap>
      <UserName>{auth.username}</UserName>
      <UserRole>{auth.role}</UserRole>
      <SignOutLink onClick={onSignOut}>Sign out</SignOutLink>
    </UserChipWrap>
  );
}

// ─── Styled components ───

const HeaderBar = styled.header`
  position: sticky;
  top: 0;
  z-index: ${t.z.sticky};
  background: ${({ $editor }) => ($editor ? t.color.accentSub : `${t.color.canvas}F2`)};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid ${t.color.borderFaint};
  height: ${t.layout.headerHeight};
`;

const Inner = styled.div`
  max-width: ${t.layout.maxWidth};
  height: 100%;
  margin: 0 auto;
  padding: 0 ${t.layout.pad.wide};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${t.space[6]};

  @media (max-width: ${t.layout.bp.wide}) {
    padding: 0 ${t.layout.pad.narrow};
  }
`;

const BrandNav = styled.div`
  display: flex;
  align-items: center;
  gap: ${t.space[8]};
  min-width: 0;
`;

const Brand = styled.a`
  display: flex;
  align-items: baseline;
  gap: ${t.space[2]};
  text-decoration: none;
  color: ${t.color.ink};
`;

const BrandMark = styled.span`
  font-family: ${t.font.serif};
  font-style: italic;
  font-size: ${t.size.xl};
  color: ${t.color.accent};
  line-height: 1;
`;

const BrandWord = styled.span`
  font-family: ${t.font.body};
  font-size: ${t.size.md};
  font-weight: ${t.weight.semibold};
  color: ${t.color.ink};
  letter-spacing: ${t.tracking.tight};
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${t.space[1]};
`;

const NavLink = styled.a`
  display: inline-flex;
  align-items: center;
  padding: ${t.space[2]} ${t.space[3]};
  border-radius: ${t.radius.sm};
  font-family: ${t.font.body};
  font-size: ${t.size.base};
  font-weight: ${t.weight.medium};
  text-decoration: none;
  transition: background ${t.motion.base} ${t.motion.ease}, color ${t.motion.base} ${t.motion.ease};

  ${({ $active }) =>
    $active
      ? css`
          background: ${t.color.dark};
          color: ${t.color.inkInverse};
          font-weight: ${t.weight.semibold};

          &:hover {
            background: ${t.color.dark};
          }
        `
      : css`
          background: transparent;
          color: ${t.color.ink2};

          &:hover {
            background: ${t.color.sunken};
            color: ${t.color.ink};
          }
        `}
`;

const MetaGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${t.space[4]};
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  color: ${t.color.ink2};
  min-width: 0;
`;

const EditorBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${t.space[1]} ${t.space[2]};
  border-radius: ${t.radius.sm};
  background: ${t.color.accentSub};
  color: ${t.color.accentInk};
  font-family: ${t.font.body};
  font-size: ${t.size.xs};
  font-weight: ${t.weight.semibold};
  letter-spacing: ${t.tracking.wider};
`;

const Engagement = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${t.space[2]};
  font-size: ${t.size.sm};
  color: ${t.color.ink2};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  strong {
    font-weight: ${t.weight.semibold};
    color: ${t.color.ink};
  }
`;

const Sep = styled.span`
  color: ${t.color.ink4};
`;

const VBar = styled.span`
  display: inline-block;
  width: 1px;
  height: 14px;
  background: ${t.color.border};
  margin: 0 ${t.space[2]};
`;

const ShareButton = styled.button`
  display: inline-flex;
  align-items: center;
  padding: ${t.space[2]} ${t.space[3]};
  background: ${t.color.surface};
  color: ${t.color.ink};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.sm};
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  font-weight: ${t.weight.medium};
  cursor: pointer;
  transition: background ${t.motion.base} ${t.motion.ease}, border-color ${t.motion.base} ${t.motion.ease};

  &:hover {
    background: ${t.color.sunken};
    border-color: ${t.color.borderStrong};
  }
`;

const UserChipWrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${t.space[2]};
  padding-left: ${t.space[3]};
  border-left: 1px solid ${t.color.borderFaint};
`;

const UserName = styled.span`
  font-family: ${t.font.body};
  font-size: ${t.size.sm};
  font-weight: ${t.weight.medium};
  color: ${t.color.ink};
`;

const UserRole = styled.span`
  font-family: ${t.font.body};
  font-size: ${t.size.xs};
  color: ${t.color.ink3};
  text-transform: uppercase;
  letter-spacing: ${t.tracking.wider};
  font-weight: ${t.weight.semibold};
`;

const SignOutLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  margin-left: ${t.space[2]};
  font-family: ${t.font.body};
  font-size: ${t.size.xs};
  color: ${t.color.accent};
  font-weight: ${t.weight.medium};
  cursor: pointer;

  &:hover {
    color: ${t.color.accentHover};
  }
`;
