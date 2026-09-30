import * as React from 'react';
/** Multi-line field — 상담 메모, AI 요약 편집. */
export interface CrmTextareaProps {
  label?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  disabled?: boolean;
  ai?: boolean;
  headerRight?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function CrmTextarea(props: CrmTextareaProps): React.JSX.Element;
export default CrmTextarea;
