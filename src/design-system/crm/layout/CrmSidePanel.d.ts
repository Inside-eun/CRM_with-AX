import * as React from 'react';
/** Right-hand side panel shell (AI Assistant, detail drawers). */
export interface CrmSidePanelProps {
  title: React.ReactNode;
  icon?: string;
  ai?: boolean;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  style?: React.CSSProperties;
}
export declare function CrmSidePanel(props: CrmSidePanelProps): React.JSX.Element;
export default CrmSidePanel;
