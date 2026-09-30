import * as React from 'react';
/** Label/value grid for customer, order, payment facts. `highlight` marks the fact the current step needs. */
export interface CrmKeyValueProps {
  items: { label: React.ReactNode; value: React.ReactNode; highlight?: boolean; mono?: boolean; tone?: 'danger'|'success'; span?: number }[];
  columns?: number;
  labelWidth?: number;
  style?: React.CSSProperties;
}
export declare function CrmKeyValue(props: CrmKeyValueProps): React.JSX.Element;
export default CrmKeyValue;
