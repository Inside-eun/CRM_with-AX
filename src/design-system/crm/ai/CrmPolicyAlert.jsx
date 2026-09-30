'use client';

import React from 'react';
import { Icon } from '../../icons/Icon.jsx';
import { CrmConfidence } from './CrmAILabel.jsx';

export function CrmPolicyAlert({ severity = 'warning', kind = '필수 안내 누락', title, policyName, policyText, revisedAt, suggestion, confidence, status = 'open', onApply, onIgnore, onLater, defaultExpanded = false, style }) {
  const [exp, setExp] = React.useState(defaultExpanded);
  const danger = severity === 'danger';
  const bd = danger ? 'var(--error-300)' : 'var(--warning-300)';
  const fg = danger ? 'var(--error-700)' : 'var(--warning-700)';
  const resolved = status !== 'open';
  return (
    <article role="status" aria-live="polite" style={{ background: '#fff', border: `1px solid ${resolved ? 'var(--gray-200)' : bd}`, borderRadius: 10, boxShadow: resolved ? 'none' : 'var(--shadow-sm)', overflow: 'hidden', animation: 'crm-slide-in .2s var(--ease-standard)', ...style }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: resolved ? 'var(--gray-50)' : danger ? 'var(--error-25)' : 'var(--warning-25)', borderBottom: `1px solid ${resolved ? 'var(--gray-200)' : bd}` }}>
        <Icon name={resolved ? (status === 'applied' ? 'CheckCircle' : 'MinusCircle') : danger ? 'AlertOctagon' : 'AlertTriangle'} size={16} style={{ color: resolved ? 'var(--gray-500)' : fg }} />
        <span style={{ font: '600 12px/18px var(--font-sans)', color: resolved ? 'var(--gray-600)' : fg, flex: 1 }}>{resolved ? (status === 'applied' ? '안내 완료' : status === 'later' ? '나중에 확인' : '무시함') : danger ? '정책과 다른 안내 감지' : kind}</span>
        {confidence != null && <CrmConfidence value={confidence} showBar={false} label="AI" />}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ font: '600 14px/20px var(--font-sans)', color: resolved ? 'var(--gray-500)' : 'var(--gray-900)', textWrap: 'pretty' }}>{title}</div>
        {!resolved && suggestion && (
          <div style={{ background: 'var(--teal-25)', border: '1px solid var(--teal-200)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, font: '600 12px/18px var(--font-sans)', color: 'var(--teal-700)', marginBottom: 2 }}><Icon name="MessageSquare" size={12} />추천 안내 문구</div>
            <div style={{ font: '400 13px/20px var(--font-sans)', color: 'var(--gray-800)', textWrap: 'pretty' }}>“{suggestion}”</div>
          </div>
        )}
        {!resolved && (
          <button type="button" onClick={() => setExp(e => !e)} aria-expanded={exp} style={{ display: 'flex', gap: 6, alignItems: 'center', border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: '500 12px/18px var(--font-sans)', color: 'var(--gray-600)' }}>
            <Icon name="BookOpen" size={12} />{policyName}{revisedAt && <span style={{ color: 'var(--gray-400)' }}>· {revisedAt} 개정</span>}
            <Icon name={exp ? 'ChevronUp' : 'ChevronDown'} size={12} style={{ marginLeft: 'auto' }} />
          </button>
        )}
        {!resolved && exp && policyText && <blockquote style={{ margin: 0, padding: '8px 10px', borderRadius: 6, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', font: '400 12px/18px var(--font-sans)', color: 'var(--gray-700)' }}>{policyText}</blockquote>}
        {!resolved && (
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <button type="button" className="crm-btn primary xs" onClick={onApply}><Icon name="Check" size={14} />적용</button>
            <button type="button" className="crm-btn secondary xs" onClick={onLater}>나중에 확인</button>
            <button type="button" className="crm-btn tertiary xs" onClick={onIgnore} style={{ marginLeft: 'auto' }}>무시</button>
          </div>
        )}
      </div>
    </article>
  );
}
export default CrmPolicyAlert;
