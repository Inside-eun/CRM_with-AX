'use client';

import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export const AGENT_STATUSES = [
  { id: 'available', label: '상담 가능', color: 'var(--success-500)', icon: 'CheckCircle' },
  { id: 'oncall', label: '상담 중', color: 'var(--brand-600)', icon: 'PhoneCall' },
  { id: 'wrapup', label: '후처리 중', color: 'var(--teal-600)', icon: 'Edit3' },
  { id: 'away', label: '자리 비움', color: 'var(--warning-500)', icon: 'Clock' },
  { id: 'break', label: '휴식', color: 'var(--gray-400)', icon: 'Coffee' },
];

export function CrmStatusSelect({ value = 'available', onChange, options = AGENT_STATUSES, compact = false, disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const cur = options.find(o => o.id === value) || options[0];
  React.useEffect(() => { if (!open) return; const h = () => setOpen(false); window.addEventListener('click', h); return () => window.removeEventListener('click', h); }, [open]);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onClick={e => e.stopPropagation()}>
      <button type="button" className="crm-btn secondary sm" disabled={disabled} onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: cur.color, boxShadow: '0 0 0 3px color-mix(in srgb, ' + cur.color + ' 20%, transparent)' }} />
        {!compact && cur.label}
        <Icon name="ChevronDown" size={16} style={{ color: 'var(--gray-400)' }} />
      </button>
      {open && (
        <div className="crm-menu" role="listbox" style={{ top: 'calc(100% + 4px)', right: 0 }}>
          {options.map(o => (
            <button key={o.id} role="option" aria-selected={o.id === value} className={o.id === value ? 'crm-menu-item is-selected' : 'crm-menu-item'} disabled={o.disabled}
              onClick={() => { onChange && onChange(o.id); setOpen(false); }} style={o.disabled ? { color: 'var(--gray-400)', cursor: 'not-allowed' } : undefined}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: o.color }} />
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.id === value && <Icon name="Check" size={16} style={{ color: 'var(--brand-600)' }} />}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
export default CrmStatusSelect;
