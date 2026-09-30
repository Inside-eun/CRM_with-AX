import React from 'react';

export function CrmSkeleton({ width = '100%', height = 16, radius = 6, lines, gap = 8, style }) {
  if (lines) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }} aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: lines }).map((_, i) => <span key={i} className="crm-skel" style={{ display: 'block', height, width: i === lines - 1 ? '60%' : width, borderRadius: radius }} />)}
    </div>
  );
  return <span className="crm-skel" aria-busy="true" style={{ display: 'inline-block', width, height, borderRadius: radius, verticalAlign: 'middle', ...style }} />;
}
export default CrmSkeleton;
