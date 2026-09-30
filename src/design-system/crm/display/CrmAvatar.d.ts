import * as React from 'react';
/** Initials avatar (no photos in CRM) with optional presence dot. */
export interface CrmAvatarProps {
  name?: string;
  size?: 'xs'|'sm'|'md'|'lg'|'xl';
  tone?: 'gray'|'blue'|'teal'|'orange'|'purple';
  status?: 'online'|'away'|'busy'|'offline';
  style?: React.CSSProperties;
}
export declare function CrmAvatar(props: CrmAvatarProps): React.JSX.Element;
export default CrmAvatar;
