import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

const TONES = {
  neutral: ['var(--gray-100)', 'var(--gray-600)'], info: ['var(--brand-50)', 'var(--brand-700)'], ai: ['var(--teal-50)', 'var(--teal-700)'],
  warning: ['var(--warning-50)', 'var(--warning-700)'], danger: ['var(--error-50)', 'var(--error-700)'], success: ['var(--success-50)', 'var(--success-700)'],
};

export function CrmTimeline({ items = [], compact = false, style }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', ...style }}>
      {items.map((it, i) => {
        const [bg, fg] = TONES[it.tone || 'neutral'];
        const last = i === items.length - 1;
        return (
          <li key={i} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: last ? 0 : (compact ? 12 : 20) }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <span style={{ width: compact ? 24 : 32, height: compact ? 24 : 32, borderRadius: 16, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fff', boxShadow: '0 0 0 1px var(--gray-200)' }}>
                <Icon name={it.icon || 'Circle'} size={compact ? 12 : 16} />
              </span>
              {!last && <span style={{ width: 2, flex: 1, background: 'var(--gray-200)', marginTop: 4, borderRadius: 1 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: compact ? 2 : 5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ font: '600 14px/20px var(--font-sans)', color: 'var(--gray-900)' }}>{it.title}</span>
                {it.meta && <span style={{ font: '400 12px/18px var(--font-sans)', color: 'var(--gray-500)' }}>{it.meta}</span>}
              </div>
              {it.desc && <div style={{ font: '400 14px/20px var(--font-sans)', color: 'var(--gray-600)', marginTop: 2, textWrap: 'pretty' }}>{it.desc}</div>}
              {it.extra && <div style={{ marginTop: 6 }}>{it.extra}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
export default CrmTimeline;
