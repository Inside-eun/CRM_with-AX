import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function CrmButton({ variant = 'secondary', size = 'md', icon, iconRight, iconOnly = false, loading = false, disabled = false, highlighted = false, step, children, onClick, title, type = 'button', style, className = '' }) {
  const isz = size === 'lg' ? 20 : size === 'xs' ? 14 : 18;
  const cls = ['crm-btn', variant, size, iconOnly && 'icon-only', highlighted && 'is-highlighted', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} disabled={disabled || loading} onClick={onClick} title={title || (iconOnly && typeof children === 'string' ? children : undefined)} aria-label={iconOnly && typeof children === 'string' ? children : undefined} aria-busy={loading || undefined} style={style}>
      {step != null && <span className="crm-step-num" aria-label={`단계 ${step}`}>{step}</span>}
      {loading ? <Icon name="Loader" size={isz} className="crm-spin" /> : icon && <Icon name={icon} size={isz} />}
      {!iconOnly && children}
      {!iconOnly && iconRight && <Icon name={iconRight} size={isz} />}
    </button>
  );
}
export default CrmButton;
