import React from 'react';

export function CrmKeyValue({ items = [], columns = 1, labelWidth = 96, style }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, columnGap: 16, rowGap: 8, margin: 0, ...style }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0, padding: it.highlight ? '4px 8px' : 0, margin: it.highlight ? '-4px -8px' : 0, borderRadius: 6,
          background: it.highlight ? 'var(--brand-50)' : 'transparent', boxShadow: it.highlight ? 'inset 0 0 0 1px var(--brand-300)' : 'none', gridColumn: it.span ? `span ${it.span}` : undefined }}>
          <dt style={{ width: labelWidth, flex: 'none', font: '400 13px/20px var(--font-sans)', color: 'var(--gray-500)' }}>{it.label}</dt>
          <dd style={{ margin: 0, flex: 1, minWidth: 0, font: `${it.highlight ? 600 : 500} 14px/20px ${it.mono ? 'var(--font-mono)' : 'var(--font-sans)'}`, color: it.tone === 'danger' ? 'var(--error-700)' : it.tone === 'success' ? 'var(--success-700)' : 'var(--gray-900)', overflowWrap: 'anywhere' }}>
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export default CrmKeyValue;
