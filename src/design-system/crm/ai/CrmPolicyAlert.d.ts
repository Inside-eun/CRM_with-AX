import * as React from 'react';
/**
 * Quiet policy warning card for the right panel — missing/incorrect guidance, policy source, revision date, suggested phrase, 적용/나중에 확인/무시.
 * @startingPoint section="AI" subtitle="Quiet in-panel policy warning" viewport="700x420"
 */
export interface CrmPolicyAlertProps {
  severity?: 'warning'|'danger';
  kind?: string;
  title: React.ReactNode;
  policyName?: React.ReactNode;
  policyText?: React.ReactNode;
  revisedAt?: string;
  suggestion?: React.ReactNode;
  confidence?: number;
  status?: 'open'|'applied'|'ignored'|'later';
  onApply?: () => void;
  onIgnore?: () => void;
  onLater?: () => void;
  defaultExpanded?: boolean;
  style?: React.CSSProperties;
}
export declare function CrmPolicyAlert(props: CrmPolicyAlertProps): React.JSX.Element;
export default CrmPolicyAlert;
