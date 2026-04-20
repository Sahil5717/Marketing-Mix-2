import styled from "styled-components";
import { t } from "../../tokens.js";

/**
 * NextStepsTile — right column on the Diagnosis bottom split row.
 *
 * Shows 3 CTA cards: primary (amber-solid) and 2 secondary (white with border).
 *
 * Props:
 *   steps — array of { label, name, sub, primary: bool, onClick }
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const Heading = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  color: ${t.color.ink3};
  text-transform: uppercase;
  margin-bottom: 12px;
  margin-top: 4px;
`;

const StepCard = styled.div`
  background: ${({ $primary }) => ($primary ? t.color.accent : t.color.surface)};
  border: 1px solid ${({ $primary }) => ($primary ? t.color.accent : t.color.border)};
  border-radius: ${t.radius.lg};
  padding: 16px 20px;
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: 1fr 30px;
  align-items: center;
  cursor: pointer;
  transition: all ${t.motion.base} ${t.motion.ease};

  &:hover {
    ${({ $primary }) =>
      $primary
        ? `background: ${t.color.accentHover}; border-color: ${t.color.accentHover};`
        : `border-color: ${t.color.borderStrong}; box-shadow: ${t.shadow.card};`}
  }
`;

const StepLabel = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 9px;
  font-weight: 700;
  letter-spacing: ${t.tracking.wider};
  text-transform: uppercase;
  margin-bottom: 3px;
  color: ${({ $primary }) =>
    $primary ? "rgba(255,255,255,0.85)" : t.color.ink3};
`;

const StepName = styled.div`
  font-family: ${t.fontV2.headline};
  font-size: 16px;
  font-weight: 600;
  line-height: 1.15;
  color: ${({ $primary }) => ($primary ? "white" : t.color.ink)};
`;

const StepSub = styled.div`
  font-family: ${t.fontV2.body};
  font-size: 11.5px;
  margin-top: 4px;
  color: ${({ $primary }) =>
    $primary ? "rgba(255,255,255,0.85)" : t.color.ink3};
`;

const Arrow = styled.span`
  font-size: 18px;
  font-weight: 600;
  text-align: right;
  color: ${({ $primary }) => ($primary ? "white" : t.color.accent)};
  user-select: none;
`;

export function NextStepsTile({ steps = [] }) {
  return (
    <Container>
      <Heading>Next steps</Heading>
      {steps.map((step, i) => (
        <StepCard
          key={`${step.name}-${i}`}
          $primary={!!step.primary}
          onClick={step.onClick}
        >
          <div>
            <StepLabel $primary={!!step.primary}>{step.label}</StepLabel>
            <StepName $primary={!!step.primary}>{step.name}</StepName>
            {step.sub && <StepSub $primary={!!step.primary}>{step.sub}</StepSub>}
          </div>
          <Arrow $primary={!!step.primary}>→</Arrow>
        </StepCard>
      ))}
    </Container>
  );
}

export default NextStepsTile;
