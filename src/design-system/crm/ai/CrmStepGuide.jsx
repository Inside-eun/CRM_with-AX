import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function CrmStepGuide({ title = '처리 단계', detected, steps = [], onStepClick, style }) {
  const done = steps.filter(s => s.status === 'done').length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ font: '600 13px/20px var(--font-sans)', color: 'var(--gray-900)', flex: 1 }}>{title}</span>
        <span style={{ font: '500 12px/18px var(--font-sans)', color: 'var(--gray-500)', fontVariantNumeric: 'tabular-nums' }}>{done}/{steps.length} 완료</span>
      </div>
      <div aria-hidden="true" style={{ display: 'flex', gap: 3 }}>{steps.map((s, i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: s.status === 'done' ? 'var(--success-500)' : s.status === 'current' ? 'var(--brand-600)' : 'var(--gray-200)' }} />)}</div>
      {detected && <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: '500 12px/18px var(--font-sans)', color: 'var(--teal-700)' }}><Icon name="Zap" size={12} />{detected}</div>}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
        {steps.map((s, i) => {
          const cur = s.status === 'current', dn = s.status === 'done';
          return (
            <li key={i} style={{ display: 'flex', gap: 10, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 24, height: 24, borderRadius: 12, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 12px/1 var(--font-sans)',
                  background: dn ? 'var(--success-600)' : cur ? 'var(--brand-600)' : '#fff', color: dn || cur ? '#fff' : 'var(--gray-500)', border: dn || cur ? 'none' : '1.5px solid var(--gray-300)', boxShadow: cur ? '0 0 0 4px var(--brand-100)' : 'none' }}>
                  {dn ? <Icon name="Check" size={12} /> : i + 1}
                </span>
                {i < steps.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 10, background: dn ? 'var(--success-300)' : 'var(--gray-200)', margin: '2px 0' }} />}
              </div>
              <button type="button" onClick={onStepClick ? () => onStepClick(s, i) : undefined} style={{ flex: 1, textAlign: 'left', border: 'none', background: 'none', padding: '2px 0 12px', cursor: onStepClick ? 'pointer' : 'default', font: 'inherit' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ font: `${cur ? 600 : 500} 13px/20px var(--font-sans)`, color: dn ? 'var(--gray-500)' : cur ? 'var(--brand-700)' : 'var(--gray-700)' }}>{s.label}</span>
                  {cur && <span className="crm-badge info" style={{ padding: '0 6px', fontSize: 11, lineHeight: '16px' }}>지금</span>}
                </span>
                {s.hint && (cur || s.showHint) && <span style={{ display: 'block', font: '400 12px/18px var(--font-sans)', color: 'var(--gray-600)', marginTop: 2 }}>{s.hint}</span>}
                {s.target && cur && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: '500 12px/18px var(--font-sans)', color: 'var(--brand-700)', marginTop: 4 }}><Icon name="CornerDownRight" size={12} />{s.target}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
export default CrmStepGuide;
