import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

const T = {
  info: ['var(--brand-25)', 'var(--brand-300)', 'var(--brand-700)', 'Info'],
  ai: ['var(--teal-25)', 'var(--teal-300)', 'var(--teal-700)', 'Cpu'],
  warning: ['var(--warning-25)', 'var(--warning-300)', 'var(--warning-700)', 'AlertTriangle'],
  danger: ['var(--error-25)', 'var(--error-300)', 'var(--error-700)', 'AlertOctagon'],
  success: ['var(--success-25)', 'var(--success-300)', 'var(--success-700)', 'CheckCircle'],
  neutral: ['var(--gray-25)', 'var(--gray-300)', 'var(--gray-700)', 'Info'],
};

export function CrmInlineAlert({ tone = 'info', title, children, actions, onClose, icon, style }) {
  const [bg, bd, fg, ic] = T[tone];
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 8, background: bg, border: `1px solid ${bd}`, ...style }}>
      <Icon name={icon || ic} size={18} style={{ color: fg, flex: 'none', marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ font: '600 14px/20px var(--font-sans)', color: fg }}>{title}</div>}
        {children && <div style={{ font: '400 13px/20px var(--font-sans)', color: 'var(--gray-700)', marginTop: title ? 2 : 0, textWrap: 'pretty' }}>{children}</div>}
        {actions && <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
      {onClose && <button type="button" onClick={onClose} aria-label="닫기" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 2 }}><Icon name="X" size={16} /></button>}
    </div>
  );
}
export default CrmInlineAlert;
