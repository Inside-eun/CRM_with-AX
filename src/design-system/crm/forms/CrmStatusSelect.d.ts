import * as React from 'react';
/** Agent availability picker (상담 가능 / 상담 중 / 후처리 중 / 자리 비움 / 휴식). */
export interface CrmStatusSelectProps {
  value?: 'available'|'oncall'|'wrapup'|'away'|'break'|string;
  onChange?: (id: string) => void;
  options?: { id: string; label: string; color: string; icon?: string; disabled?: boolean }[];
  compact?: boolean;
  disabled?: boolean;
}
export declare function CrmStatusSelect(props: CrmStatusSelectProps): React.JSX.Element;
export default CrmStatusSelect;
