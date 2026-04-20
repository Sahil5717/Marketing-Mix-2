import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * DiagnosisHero — hero block for DiagnosisV2.
 *
 *   DIAGNOSIS · REVIEWED 20 APR 2026
 *   Portfolio ROAS is 2.8× — above benchmark. But $14.1M is
 *   recoverable across three decision areas.
 *
 *   (SR avatar) Reviewed by Sarah Rahman, Senior Manager · 12 channels · 34 campaigns
 *
 * The headline rendered here is built by the parent screen since it mixes
 * live data (portfolio ROAS, recoverable amount) with narrative copy.
 * This component handles the presentation layer only.
 */

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
  margin: 0 0 8px 0;
  max-width: 920px;

  em {
    font-style: italic;
    color: ${t.color.accent};
  }
`;

const Reviewer = styled.div`
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ${t.fontV2.body};
  font-size: 13px;
  color: ${t.color.ink2};

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
  flex-shrink: 0;
`;

function initials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DiagnosisHero({ eyebrow, headline, reviewer }) {
  return (
    <>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Headline
        dangerouslySetInnerHTML={{ __html: headline }}
      />
      {reviewer && (
        <Reviewer>
          <Avatar>{initials(reviewer.name)}</Avatar>
          <span>
            Reviewed by <strong>{reviewer.name}</strong>, {reviewer.role} ·{" "}
            {reviewer.channels} channels · {reviewer.campaigns} campaigns
          </span>
        </Reviewer>
      )}
    </>
  );
}

export default DiagnosisHero;
