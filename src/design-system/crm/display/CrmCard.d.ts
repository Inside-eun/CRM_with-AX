import * as React from 'react';
/**
 * White card container — the basic region of every CRM screen. `tone` adds a colored border when the card is relevant to the current step.
 * @startingPoint section="Display" subtitle="Card with header, step label and tone border" viewport="700x360"
 */
export interface CrmCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  tone?: 'info'|'ai'|'warning'|'danger'|'success';
  dimmed?: boolean;
  /** e.g. "STEP 2" — shown as a square info badge in the header */
  stepLabel?: string;
  flush?: boolean;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}
export declare function CrmCard(props: CrmCardProps): React.JSX.Element;
export default CrmCard;
