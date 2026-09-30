import * as React from 'react';
/** Inline, non-blocking notice (info/ai/warning/danger/success) — never a modal. */
export interface CrmInlineAlertProps {
  tone?: 'info'|'ai'|'warning'|'danger'|'success'|'neutral';
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
  icon?: string;
  style?: React.CSSProperties;
}
export declare function CrmInlineAlert(props: CrmInlineAlertProps): React.JSX.Element;
export default CrmInlineAlert;
