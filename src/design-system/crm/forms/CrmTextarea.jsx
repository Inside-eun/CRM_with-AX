import React from 'react';

// headerRight에 버튼이 들어가도 라벨이 버튼이 아닌 textarea를 가리키도록 <label>을 제목에만 씁니다.
// (원본은 필드 전체를 <label>로 감싸 라벨 클릭 시 headerRight 버튼이 눌렸습니다.)
export function CrmTextarea({ label, value, defaultValue, onChange, placeholder, rows = 4, hint, error, disabled = false, ai = false, headerRight, style }) {
  const id = React.useId();
  return (
    <div className="crm-field" style={style}>
      {(label || headerRight) && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><label htmlFor={id} className="crm-label" style={{ flex: 1 }}>{label}</label>{headerRight}</span>}
      <span className={['crm-control', error && 'is-error', disabled && 'is-disabled', ai && 'is-ai'].filter(Boolean).join(' ')} style={{ alignItems: 'stretch' }}>
        <textarea id={id} rows={rows} value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder} disabled={disabled} aria-invalid={!!error || undefined} />
      </span>
      {(error || hint) && <span className={error ? 'crm-hint error' : 'crm-hint'}>{error || hint}</span>}
    </div>
  );
}
export default CrmTextarea;
