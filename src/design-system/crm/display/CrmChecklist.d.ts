import * as React from 'react';
/** Numbered checklist with done / current / todo / warning / blocked states — used for 필요한 확인 사항 and 고객 안내 체크. */
export interface CrmChecklistItem {
  id?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  status?: 'done'|'current'|'todo'|'warning'|'blocked';
  statusLabel?: string;
}
export interface CrmChecklistProps<Item extends CrmChecklistItem = CrmChecklistItem> {
  items: Item[];
  onToggle?: (item: Item) => void;
  numbered?: boolean;
  style?: React.CSSProperties;
}
export declare function CrmChecklist<Item extends CrmChecklistItem = CrmChecklistItem>(props: CrmChecklistProps<Item>): React.JSX.Element;
export default CrmChecklist;
