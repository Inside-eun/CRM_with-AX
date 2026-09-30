import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function CrmSelect({ label, value, defaultValue, onChange, options = [], placeholder, hint, error, disabled = false, ai = false, size = 'md', icon, style }) {
  return (
    <label className="crm-field" style={style}>
      {label && <span className="crm-label">{label}</span>}
      <span className={['crm-control', size === 'sm' && 'sm', error && 'is-error', disabled && 'is-disabled', ai && 'is-ai'].filter(Boolean).join(' ')} style={{ position: 'relative' }}>
        {icon && <Icon name={icon} size={18} />}
        <select value={value} defaultValue={defaultValue} onChange={onChange} disabled={disabled} style={{ paddingRight: 20, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon name="ChevronDown" size={18} style={{ position: 'absolute', right: 12, pointerEvents: 'none' }} />
      </span>
      {(error || hint) && <span className={error ? 'crm-hint error' : 'crm-hint'}>{error || hint}</span>}
    </label>
  );
}
export default CrmSelect;
