import * as React from 'react';
/** AI-recommended answer the agent can insert or copy — never auto-sent. */
export interface CrmSuggestedReplyProps {
  text: React.ReactNode;
  context?: React.ReactNode;
  onInsert?: () => void;
  onCopy?: () => void;
  used?: boolean;
  style?: React.CSSProperties;
}
export declare function CrmSuggestedReply(props: CrmSuggestedReplyProps): React.JSX.Element;
export default CrmSuggestedReply;
