import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function confidenceLevel(v) { return v >= 85 ? ['높음', 'success'] : v >= 65 ? ['보통', 'warning'] : ['낮음', 'danger']; }

export function CrmConfidence({ value = 0, showBar = true, label = '신뢰도', style }) {
  const [lvl, tone] = confidenceLevel(value);
  const col = tone === 'success' ? 'var(--teal-600)' : tone === 'warning' ? 'var(--warning-500)' : 'var(--error-500)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '500 12px/18px var(--font-sans)', color: 'var(--gray-600)', ...style }} title={`AI ${label} ${value}% (${lvl})`}>
      {label}
      {showBar && <span aria-hidden="true" style={{ width: 40, height: 6, borderRadius: 3, background: 'var(--gray-200)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: value + '%', background: col, borderRadius: 3 }} /></span>}
      <span style={{ color: 'var(--gray-900)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}%</span>
      <span style={{ color: tone === 'danger' ? 'var(--error-700)' : tone === 'warning' ? 'var(--warning-700)' : 'var(--teal-700)' }}>{lvl}</span>
    </span>
  );
}

export function CrmAILabel({ text = 'AI 생성', confidence, source, size = 'sm', style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', ...style }}>
      <span className={`crm-badge ai ${size}`} style={{ fontWeight: 600 }}><Icon name="Cpu" size={12} />{text}</span>
      {confidence != null && <CrmConfidence value={confidence} />}
      {source && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: '400 12px/18px var(--font-sans)', color: 'var(--gray-500)' }}><Icon name="BookOpen" size={12} />{source}</span>}
    </span>
  );
}
export default CrmAILabel;
