import * as React from 'react';
/** Vertical event timeline for 상담 이력, 처리 상태 변경 이력, 배송 추적. */
export interface CrmTimelineProps {
  items: { title: React.ReactNode; meta?: React.ReactNode; desc?: React.ReactNode; icon?: string; tone?: 'neutral'|'info'|'ai'|'warning'|'danger'|'success'; extra?: React.ReactNode }[];
  compact?: boolean;
  style?: React.CSSProperties;
}
export declare function CrmTimeline(props: CrmTimelineProps): React.JSX.Element;
export default CrmTimeline;
