import * as React from 'react';
import type { CrmTopBarProps } from './CrmTopBar';
/**
 * Full 1440px CRM frame: global nav + top bar + scrollable main.
 * @startingPoint section="Layout" subtitle="Global nav + top bar CRM shell" viewport="1440x900"
 */
export interface CrmAppShellProps {
  active?: string;
  onNavigate?: (id: string) => void;
  navItems?: { id: string; label: string; icon: string; badge?: number }[];
  /** Rendered at the bottom of the global nav */
  navFooter?: React.ReactNode;
  topBarProps?: CrmTopBarProps;
  children?: React.ReactNode;
  height?: number|string;
  contentStyle?: React.CSSProperties;
}
export declare function CrmAppShell(props: CrmAppShellProps): React.JSX.Element;
export default CrmAppShell;
