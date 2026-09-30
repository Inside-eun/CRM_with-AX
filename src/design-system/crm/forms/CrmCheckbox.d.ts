import * as React from 'react';
/** Checkbox or radio with label and hint. */
export interface CrmCheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  radio?: boolean;
  style?: React.CSSProperties;
}
export declare function CrmCheckbox(props: CrmCheckboxProps): React.JSX.Element;
export default CrmCheckbox;
