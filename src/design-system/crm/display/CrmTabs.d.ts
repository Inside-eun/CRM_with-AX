import * as React from 'react';
/** Underline or segmented tabs for switching panes inside a card or page. */
export interface CrmTabsProps {
  tabs: { id: string; label: React.ReactNode; count?: number; disabled?: boolean }[];
  value?: string;
  onChange?: (id: string) => void;
  variant?: 'underline'|'segmented';
  style?: React.CSSProperties;
}
export declare function CrmTabs(props: CrmTabsProps): React.JSX.Element;
export default CrmTabs;
