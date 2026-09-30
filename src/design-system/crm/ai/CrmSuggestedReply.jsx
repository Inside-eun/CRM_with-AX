import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export function CrmSuggestedReply({ text, context, onInsert, onCopy, used = false, style }) {
  return (
    <div style={{ border: `1px solid ${used ? 'var(--gray-200)' : 'var(--teal-200)'}`, background: used ? 'var(--gray-25)' : '#fff', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {context && <div style={{ font: '500 12px/18px var(--font-sans)', color: 'var(--teal-700)' }}>{context}</div>}
      <div style={{ font: '400 14px/20px var(--font-sans)', color: used ? 'var(--gray-500)' : 'var(--gray-800)', textWrap: 'pretty' }}>{text}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="crm-btn ai xs" onClick={onInsert} disabled={used}>{used ? <><Icon name="Check" size={14} />사용함</> : <><Icon name="CornerDownLeft" size={14} />메모에 삽입</>}</button>
        <button type="button" className="crm-btn tertiary xs" onClick={onCopy}><Icon name="Copy" size={14} />복사</button>
      </div>
    </div>
  );
}
export default CrmSuggestedReply;
