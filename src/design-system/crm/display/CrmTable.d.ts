import * as React from 'react';
/** Dense data table with hover, selected, highlighted, disabled, loading (skeleton) and empty states. */
export interface CrmTableColumn<Row> {
  key: string;
  label: React.ReactNode;
  width?: number|string;
  align?: 'left'|'right'|'center';
  strong?: boolean;
  render?: (row: Row) => React.ReactNode;
}
export interface CrmTableProps<Row extends object> {
  columns: CrmTableColumn<Row>[];
  /** `disabled: true`인 행은 흐리게 표시됩니다. */
  rows: Row[];
  /** 행 식별 필드 (기본 "id") */
  rowKey?: string;
  selectedId?: string|number;
  highlightIds?: (string|number)[];
  onRowClick?: (row: Row) => void;
  loading?: boolean;
  emptyText?: string;
  dense?: boolean;
  style?: React.CSSProperties;
}
export declare function CrmTable<Row extends object>(props: CrmTableProps<Row>): React.JSX.Element;
export default CrmTable;
