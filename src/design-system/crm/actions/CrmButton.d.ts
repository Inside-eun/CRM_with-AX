import * as React from 'react';
/**
 * Action button for every CRM command (처리 버튼, 상담 제어). Use `highlighted`+`step` when the AI step guide points at this action.
 * @startingPoint section="Actions" subtitle="Primary/secondary/AI/danger buttons with step highlight" viewport="700x320"
 */
export interface CrmButtonProps {
  variant?: 'primary'|'secondary'|'tertiary'|'danger'|'danger-secondary'|'ai'|'link';
  size?: 'xs'|'sm'|'md'|'lg';
  /** Icon name from components/icons (PascalCase, e.g. "PhoneCall") */
  icon?: string;
  iconRight?: string;
  iconOnly?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** Blue 2px ring — the AI step guide marks the next action this way */
  highlighted?: boolean;
  /** Step number chip shown on the top-left corner */
  step?: number;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  type?: 'button'|'submit';
  style?: React.CSSProperties;
  className?: string;
}
export declare function CrmButton(props: CrmButtonProps): React.JSX.Element;
export default CrmButton;
