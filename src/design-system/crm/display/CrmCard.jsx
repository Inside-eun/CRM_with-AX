import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function CrmCard({ title, subtitle, icon, actions, badge, tone, dimmed = false, stepLabel, flush = false, footer, children, style, bodyStyle }) {
  return (
    <section className={['crm-card', tone && `tone-${tone}`, dimmed && 'is-dimmed'].filter(Boolean).join(' ')} style={style}>
      {(title || actions) && (
        <header className="crm-card-head">
          {icon && <Icon name={icon} size={18} style={{ color: tone === 'ai' ? 'var(--teal-600)' : 'var(--gray-500)' }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="crm-card-title">{title}{badge}</h3>
            {subtitle && <div className="crm-card-sub">{subtitle}</div>}
          </div>
          {stepLabel && <span className="crm-badge info square" style={{ fontWeight: 600 }}>{stepLabel}</span>}
          {actions}
        </header>
      )}
      <div className={flush ? 'crm-card-body flush' : 'crm-card-body'} style={bodyStyle}>{children}</div>
      {footer && <footer className="crm-card-foot">{footer}</footer>}
    </section>
  );
}
export default CrmCard;
