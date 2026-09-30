import * as React from 'react';
/** Native select styled to match inputs. */
export interface CrmSelectProps {
  label?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: (string | { value: string; label: string })[];
  placeholder?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  disabled?: boolean;
  ai?: boolean;
  size?: 'sm'|'md';
  icon?: string;
  style?: React.CSSProperties;
}
export declare function CrmSelect(props: CrmSelectProps): React.JSX.Element;
export default CrmSelect;
