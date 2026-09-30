import * as React from 'react';
/** Marks content as AI-generated, with optional confidence and policy source. Put it on every AI output. */
export interface CrmAILabelProps {
  text?: string;
  confidence?: number;
  source?: React.ReactNode;
  size?: 'sm'|'md';
  style?: React.CSSProperties;
}
export interface CrmConfidenceProps {
  /** 0–100 */
  value?: number;
  showBar?: boolean;
  label?: React.ReactNode;
  style?: React.CSSProperties;
}
/** 높음 ≥85 / 보통 ≥65 / 낮음 — [라벨, tone] */
export declare function confidenceLevel(value: number): ['높음' | '보통' | '낮음', 'success' | 'warning' | 'danger'];
export declare function CrmConfidence(props: CrmConfidenceProps): React.JSX.Element;
export declare function CrmAILabel(props: CrmAILabelProps): React.JSX.Element;
export default CrmAILabel;
