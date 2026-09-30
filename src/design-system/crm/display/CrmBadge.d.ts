import * as React from 'react';
/** Status label — always pairs color with text (and optionally icon/dot) so state is never color-only. */
export interface CrmBadgeProps {
  tone?: 'neutral'|'info'|'ai'|'warning'|'danger'|'success'|'purple'|'solid-navy';
  size?: 'sm'|'md';
  icon?: string;
  dot?: boolean;
  square?: boolean;
  /** Auto icon per tone (Info / Cpu / AlertTriangle / AlertOctagon / CheckCircle) */
  showToneIcon?: boolean;
  children?: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
}
export declare function CrmBadge(props: CrmBadgeProps): React.JSX.Element;
export default CrmBadge;
