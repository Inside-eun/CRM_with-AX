import React from 'react';
import { Icon } from '../../icons/Icon.jsx';
import { CrmStatusSelect } from '../forms/CrmStatusSelect.jsx';
import { CrmAvatar } from '../display/CrmAvatar.jsx';

export function CrmTopBar({ searchPlaceholder = '고객명, 전화번호, 주문번호 검색', onSearch, notifications = 0, onNotificationsClick, status = 'available', onStatusChange, agentName = '김하늘', agentRole = '상담사 · 커머스 1팀', left, style }) {
  return (
    <header style={{ height: 'var(--topbar-height)', flex: 'none', display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', background: '#fff', borderBottom: '1px solid var(--gray-200)', ...style }}>
      {left}
      <form role="search" style={{ width: 400, maxWidth: '40%' }} onSubmit={e => { e.preventDefault(); onSearch && onSearch(String(new FormData(e.currentTarget).get('q') || '').trim()); }}>
        <label className="crm-control sm">
          <Icon name="Search" size={18} />
          <input name="q" placeholder={searchPlaceholder} aria-label="통합 검색" />
          <span style={{ font: '500 12px/18px var(--font-sans)', color: 'var(--gray-400)', border: '1px solid var(--gray-200)', borderRadius: 4, padding: '0 4px' }}>Enter</span>
        </label>
      </form>
      <div style={{ flex: 1 }} />
      <button type="button" className="crm-btn tertiary sm icon-only" aria-label={`알림 ${notifications}건`} onClick={onNotificationsClick} style={{ position: 'relative' }}>
        <Icon name="Bell" size={20} />
        {notifications > 0 && <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, background: 'var(--error-600)', color: '#fff', font: '600 10px/16px var(--font-sans)', padding: '0 4px' }}>{notifications}</span>}
      </button>
      <CrmStatusSelect value={status} onChange={onStatusChange} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 16, borderLeft: '1px solid var(--gray-200)' }}>
        <CrmAvatar name={agentName} size="sm" tone="blue" status={status === 'available' ? 'online' : status === 'away' ? 'away' : status === 'break' ? 'offline' : 'busy'} />
        <div style={{ lineHeight: 1 }}>
          <div style={{ font: '600 14px/20px var(--font-sans)', color: 'var(--gray-900)' }}>{agentName}</div>
          <div style={{ font: '400 12px/18px var(--font-sans)', color: 'var(--gray-500)' }}>{agentRole}</div>
        </div>
      </div>
    </header>
  );
}
export default CrmTopBar;
