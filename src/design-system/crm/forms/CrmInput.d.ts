import * as React from 'react';
/** Text input with label, hint, error, disabled and AI-prefilled (`ai`) states. */
export interface CrmInputProps {
  label?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: string;
  trailing?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  disabled?: boolean;
  ai?: boolean;
  size?: 'sm'|'md';
  type?: string;
  style?: React.CSSProperties;
}
export declare function CrmInput(props: CrmInputProps): React.JSX.Element;
export default CrmInput;
