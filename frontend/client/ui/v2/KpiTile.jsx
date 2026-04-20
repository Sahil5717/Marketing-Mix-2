import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * KpiTile — individual KPI card for the Diagnosis 5-tile strip.
 *
 * Shape:
 *   ┌─────────────────────────────  →
 *   │ MARKETING ROI
 *   │ 3.4×
 *   │ ▲ 0.3× vs last quarter
 *   └─────────────────────────────
 *
 * The small "→" arrow in the top-right indicates drill-through. Clicking the
 * tile should route to a deeper view of that KPI (wired by the parent screen).
 *
 * Props:
 *   label       — uppercase small label (e.g. "Marketing ROI")
 *   value       — the primary number. Render as-is; caller formats the number.
 *   unit        — small suffix after value (×, %, M)
 *   delta       — signed numeric delta vs prior quarter (e.g. +0.3, -0.2). Optional.
 *   deltaUnit   — unit on the delta (×, pts). Optional.
 *   deltaDir    — "up" | "down" | "flat". Drives the color and arrow glyph.
 *   sub         — secondary caption line below the delta (e.g. "vs last quarter")
 *   unavailable — if true, renders N/A with a CTA link in place of the value
 *   cta         — if unavailable, the text shown in accent color (e.g. "Upload customer data →")
 *   onClick     — tile click handler (for drill-through)
 */

const Tile = styled.div`
  position: relative;
  background: ${t.color.surface};
  border: 1px solid ${t.color.border};
  border-radius: ${t.radius.lg};
  padding: 18px 20px;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  transition: border-color ${t.motion.base} ${t.motion.ease},
              box-shadow ${t.motion.base} ${t.motion.ease};

  &:hover {
    ${({ $clickable }) =>
      $clickable &&
      `
      border-color: ${t.color.borderStrong};
      box-shadow: ${t.shadow.card};
    `}
  }
`;

const DrillArrow = styled.span`
  position: absolute;
  top: 14px;
  right: 16px;
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};
  font-weight: 600;
  pointer-events: none;
`;

const Label = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
  margin-bottom: 10px;
`;

const ValueRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  line-height: 1;
`;

const Value = styled.span`
  font-family: ${t.fontV2.headline};
  font-size: 32px;
  font-weight: 600;
  color: ${({ $unavailable }) => ($unavailable ? t.color.ink3 : t.color.ink)};
  font-style: ${({ $unavailable }) => ($unavailable ? "italic" : "normal")};
  line-height: 1;
`;

const Unit = styled.span`
  font-size: 16px;
  color: ${t.color.ink2};
`;

const Sub = styled.div`
  margin-top: 8px;
  font-family: ${t.fontV2.body};
  font-size: 11px;
  color: ${t.color.ink3};

  strong {
    font-weight: 600;
  }
`;

const DeltaSpan = styled.strong`
  color: ${({ $dir }) =>
    $dir === "up" ? t.color.positive : $dir === "down" ? t.color.negative : t.color.ink3};
`;

const Cta = styled.span`
  color: ${t.color.accent};
  font-weight: 600;
`;

function deltaGlyph(dir) {
  if (dir === "up") return "▲";
  if (dir === "down") return "▼";
  return "";
}

function formatDelta(delta, unit = "×") {
  if (delta == null) return "";
  const abs = Math.abs(delta);
  // Render with sensible precision: for ×-unit show 1 decimal, for pts no decimals
  if (unit === "pts" || unit === "%") {
    return `${abs.toFixed(0)}${unit}`;
  }
  return `${abs.toFixed(1)}${unit}`;
}

export function KpiTile({
  label,
  value,
  unit,
  secondary,    // optional small text after value (e.g. "of 12") — distinct from unit suffix
  delta,
  deltaUnit = "×",
  deltaDir = "flat",
  sub,
  unavailable = false,
  cta,
  onClick,
}) {
  const clickable = !!onClick;
  return (
    <Tile $clickable={clickable} onClick={onClick}>
      {clickable && <DrillArrow>→</DrillArrow>}
      <Label>{label}</Label>
      {unavailable ? (
        <>
          <ValueRow>
            <Value $unavailable>N / A</Value>
          </ValueRow>
          {cta && <Sub><Cta>{cta}</Cta></Sub>}
        </>
      ) : (
        <>
          <ValueRow>
            <Value>{value}</Value>
            {unit && <Unit>{unit}</Unit>}
            {secondary && <Unit>{secondary}</Unit>}
          </ValueRow>
          <Sub>
            {delta != null && deltaDir !== "flat" && (
              <DeltaSpan $dir={deltaDir}>
                {deltaGlyph(deltaDir)} {formatDelta(delta, deltaUnit)}
              </DeltaSpan>
            )}
            {delta != null && deltaDir !== "flat" && sub && " "}
            {sub}
          </Sub>
        </>
      )}
    </Tile>
  );
}

export default KpiTile;
