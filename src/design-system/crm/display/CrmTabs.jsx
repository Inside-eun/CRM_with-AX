import React from 'react';

export function CrmTabs({ tabs = [], value, onChange, variant = 'underline', style }) {
  return (
    <div className={variant === 'segmented' ? 'crm-tabs segmented' : 'crm-tabs'} role="tablist" style={style}>
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={value === t.id} disabled={t.disabled} className={value === t.id ? 'crm-tab is-active' : 'crm-tab'} onClick={() => onChange && onChange(t.id)}>
          {t.label}
          {t.count != null && <span className="crm-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export default CrmTabs;
