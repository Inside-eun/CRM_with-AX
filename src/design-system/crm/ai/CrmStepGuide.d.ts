import * as React from 'react';
/** AI-detected processing steps with numbered progress; the current step names the UI target it highlights. */
export interface CrmStepGuideStep {
  label: React.ReactNode;
  hint?: React.ReactNode;
  target?: React.ReactNode;
  status?: 'done'|'current'|'todo';
  showHint?: boolean;
}
export interface CrmStepGuideProps {
  title?: string;
  detected?: React.ReactNode;
  steps: CrmStepGuideStep[];
  onStepClick?: (step: CrmStepGuideStep, index: number) => void;
  style?: React.CSSProperties;
}
export declare function CrmStepGuide(props: CrmStepGuideProps): React.JSX.Element;
export default CrmStepGuide;
