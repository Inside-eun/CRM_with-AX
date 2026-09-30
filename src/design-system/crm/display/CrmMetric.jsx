import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function CrmMetric({ label, value, unit, delta, deltaTone, hint, icon, loading = false, style }) {
  const up = typeof delta === 'string' && delta.trim().startsWith('+');
  const tone = deltaTone || (up ? 'success' : 'danger');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, ...style }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', font: '500 13px/20px var(--font-sans)', color: 'var(--gray-600)' }}>
        {icon && <Icon name={icon} size={16} style={{ color: 'var(--gray-400)' }} />}{label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        {loading ? <span className="crm-skel" style={{ width: 80, height: 32, display: 'inline-block' }} /> :
          <span style={{ font: '600 24px/32px var(--font-sans)', color: 'var(--gray-900)', fontVariantNumeric: 'tabular-nums' }}>{value}{unit && <span style={{ font: '500 14px/20px var(--font-sans)', color: 'var(--gray-500)', marginLeft: 2 }}>{unit}</span>}</span>}
        {delta && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, font: '500 13px/20px var(--font-sans)', color: tone === 'success' ? 'var(--success-700)' : tone === 'danger' ? 'var(--error-700)' : 'var(--gray-600)' }}>
          <Icon name={up ? 'ArrowUp' : 'ArrowDown'} size={12} />{delta.replace(/^[+-]/, '')}</span>}
      </div>
      {hint && <div style={{ font: '400 12px/18px var(--font-sans)', color: 'var(--gray-500)' }}>{hint}</div>}
    </div>
  );
}
export default CrmMetric;
