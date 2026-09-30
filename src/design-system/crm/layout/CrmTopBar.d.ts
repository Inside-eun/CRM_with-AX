import * as React from 'react';
/** Top bar: unified search, notifications, agent status, profile. */
export interface CrmTopBarProps {
  searchPlaceholder?: string;
  /** Enter로 제출한 검색어 (앞뒤 공백 제거) */
  onSearch?: (query: string) => void;
  notifications?: number;
  onNotificationsClick?: () => void;
  status?: string;
  onStatusChange?: (id: string) => void;
  agentName?: string;
  agentRole?: string;
  left?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function CrmTopBar(props: CrmTopBarProps): React.JSX.Element;
export default CrmTopBar;
