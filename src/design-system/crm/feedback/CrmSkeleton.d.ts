import * as React from 'react';
/** Loading placeholder block or line stack. */
export interface CrmSkeletonProps {
  width?: number|string;
  height?: number;
  radius?: number;
  lines?: number;
  gap?: number;
  style?: React.CSSProperties;
}
export declare function CrmSkeleton(props: CrmSkeletonProps): React.JSX.Element;
export default CrmSkeleton;
