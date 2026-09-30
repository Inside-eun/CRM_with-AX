import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function CrmCheckbox({ checked = false, onChange, label, hint, disabled = false, radio = false, style }) {
  return (
    <label className={['crm-check', checked && 'is-checked', disabled && 'is-disabled', radio && 'radio'].filter(Boolean).join(' ')} style={style}>
      <input type={radio ? 'radio' : 'checkbox'} checked={checked} disabled={disabled} onChange={e => onChange && onChange(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span className="crm-check-box" aria-hidden="true">{checked && (radio ? <span style={{ width: 6, height: 6, borderRadius: 3, background: '#fff' }} /> : <Icon name="Check" size={12} />)}</span>
      {(label || hint) && <span>{label}{hint && <span style={{ display: 'block', font: '400 13px/20px var(--font-sans)', color: 'var(--gray-500)' }}>{hint}</span>}</span>}
    </label>
  );
}
export default CrmCheckbox;
