import * as React from 'react';
/** KPI figure with label, unit, delta and hint — for 상담원 홈 and 관리자 대시보드. */
export interface CrmMetricProps {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  /** "+12%" / "-3%" */
  delta?: string;
  deltaTone?: 'success'|'danger'|'neutral';
  hint?: React.ReactNode;
  icon?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}
export declare function CrmMetric(props: CrmMetricProps): React.JSX.Element;
export default CrmMetric;
