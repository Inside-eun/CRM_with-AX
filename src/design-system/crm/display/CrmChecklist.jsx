import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

const S = {
  done: { icon: 'Check', bg: 'var(--success-600)', fg: '#fff', label: '완료', text: 'var(--gray-500)' },
  current: { icon: null, bg: 'var(--brand-600)', fg: '#fff', label: '진행 중', text: 'var(--gray-900)' },
  todo: { icon: null, bg: '#fff', fg: 'var(--gray-500)', label: '대기', text: 'var(--gray-700)' },
  warning: { icon: 'AlertTriangle', bg: 'var(--warning-50)', fg: 'var(--warning-700)', label: '확인 필요', text: 'var(--gray-900)' },
  blocked: { icon: 'X', bg: 'var(--gray-100)', fg: 'var(--gray-400)', label: '해당 없음', text: 'var(--gray-400)' },
};

export function CrmChecklist({ items = [], onToggle, numbered = true, style }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {items.map((it, i) => {
        const s = S[it.status || 'todo'];
        const cur = it.status === 'current';
        return (
          <li key={it.id || i}>
            <button type="button" onClick={onToggle ? () => onToggle(it) : undefined} disabled={it.status === 'blocked'} aria-current={cur ? 'step' : undefined}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: onToggle && it.status !== 'blocked' ? 'pointer' : 'default',
                border: cur ? '1px solid var(--brand-300)' : '1px solid transparent', background: cur ? 'var(--brand-25)' : 'transparent', font: 'inherit' }}>
              <span aria-hidden="true" style={{ width: 22, height: 22, flex: 'none', borderRadius: 11, background: s.bg, color: s.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 12px/1 var(--font-sans)',
                border: it.status === 'todo' ? '1.5px solid var(--gray-300)' : it.status === 'warning' ? '1.5px solid var(--warning-300)' : 'none' }}>
                {s.icon ? <Icon name={s.icon} size={12} /> : numbered ? i + 1 : null}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', font: `${cur ? 600 : 500} 14px/20px var(--font-sans)`, color: s.text, textDecorationLine: it.status === 'done' ? 'line-through' : 'none', textDecorationColor: 'var(--gray-300)' }}>{it.label}</span>
                {it.hint && <span style={{ display: 'block', font: '400 12px/18px var(--font-sans)', color: 'var(--gray-500)', marginTop: 2 }}>{it.hint}</span>}
              </span>
              <span className="crm-sr" style={{ font: '500 12px/22px var(--font-sans)', color: cur ? 'var(--brand-700)' : it.status === 'warning' ? 'var(--warning-700)' : 'var(--gray-400)', whiteSpace: 'nowrap' }}>{it.statusLabel || s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
export default CrmChecklist;
