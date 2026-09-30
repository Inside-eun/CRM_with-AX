import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function CrmInput({ label, value, defaultValue, onChange, placeholder, icon, trailing, hint, error, disabled = false, ai = false, size = 'md', type = 'text', style }) {
  return (
    <label className="crm-field" style={style}>
      {label && <span className="crm-label">{label}</span>}
      <span className={['crm-control', size === 'sm' && 'sm', error && 'is-error', disabled && 'is-disabled', ai && 'is-ai'].filter(Boolean).join(' ')}>
        {icon && <Icon name={icon} size={18} />}
        <input type={type} value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder} disabled={disabled} aria-invalid={!!error || undefined} />
        {error && <Icon name="AlertCircle" size={16} style={{ color: 'var(--error-500)' }} />}
        {trailing}
      </span>
      {(error || hint) && <span className={error ? 'crm-hint error' : 'crm-hint'}>{error || hint}</span>}
    </label>
  );
}
export default CrmInput;
