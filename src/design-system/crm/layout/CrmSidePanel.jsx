import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function CrmSidePanel({ title, icon, ai = false, subtitle, actions, onClose, children, footer, width = 360, style }) {
  return (
    <aside style={{ width, flex: 'none', display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid var(--gray-200)', minHeight: 0, ...style }} aria-label={typeof title === 'string' ? title : undefined}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--gray-200)', background: ai ? 'var(--teal-25)' : '#fff' }}>
        {icon && <span style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ai ? 'var(--teal-100)' : 'var(--gray-100)', color: ai ? 'var(--teal-700)' : 'var(--gray-600)' }}><Icon name={icon} size={16} /></span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: '600 14px/20px var(--font-sans)', color: 'var(--gray-900)' }}>{title}</div>
          {subtitle && <div style={{ font: '400 12px/18px var(--font-sans)', color: 'var(--gray-500)' }}>{subtitle}</div>}
        </div>
        {actions}
        {onClose && <button type="button" className="crm-btn tertiary xs icon-only" onClick={onClose} aria-label="패널 닫기"><Icon name="X" size={16} /></button>}
      </header>
      <div className="crm-scroll" style={{ flex: 1, minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
      {footer && <footer style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-200)' }}>{footer}</footer>}
    </aside>
  );
}
export default CrmSidePanel;
