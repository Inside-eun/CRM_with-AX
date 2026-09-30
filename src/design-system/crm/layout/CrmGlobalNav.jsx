import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

export const CRM_NAV = [
  { id: 'home', label: '상담 홈', icon: 'Headphones' },
  { id: 'customers', label: '고객', icon: 'Users' },
  { id: 'orders', label: '주문', icon: 'Package' },
  { id: 'history', label: '상담 이력', icon: 'Clock' },
  { id: 'knowledge', label: '지식·매뉴얼', icon: 'BookOpen' },
  { id: 'voc', label: 'VOC 분석', icon: 'BarChart2' },
  { id: 'admin', label: '관리자 설정', icon: 'Settings' },
];

export function CrmGlobalNav({ items: itemsProp, active, onNavigate, productName = 'AX CRM', footer }) {
  const items = itemsProp || CRM_NAV;
  return (
    <nav aria-label="글로벌 내비게이션" style={{ width: 'var(--nav-width)', flex: 'none', background: 'var(--surface-nav)', display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 4 }}>
      <div style={{ padding: '0 12px 20px', font: '700 18px/28px var(--font-sans)', color: '#fff', letterSpacing: '-0.01em' }}>{productName}</div>
      {items.map(it => (
        <button key={it.id} type="button" className={active === it.id ? 'crm-nav-item is-active' : 'crm-nav-item'} aria-current={active === it.id ? 'page' : undefined} onClick={() => onNavigate && onNavigate(it.id)}>
          <Icon name={it.icon} size={20} style={{ color: active === it.id ? '#fff' : 'var(--gray-400)' }} />
          <span style={{ flex: 1 }}>{it.label}</span>
          {it.badge != null && <span style={{ font: '500 12px/18px var(--font-sans)', background: 'var(--navy-700)', color: 'var(--gray-300)', borderRadius: 16, padding: '0 8px' }}>{it.badge}</span>}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      {footer}
    </nav>
  );
}
export default CrmGlobalNav;
