import React from 'react';
import { CrmSkeleton } from '../feedback/CrmSkeleton.jsx';

export function CrmTable({ columns = [], rows = [], rowKey = 'id', selectedId, highlightIds = [], onRowClick, loading = false, emptyText = '데이터가 없습니다.', dense = false, style }) {
  const pad = dense ? { padding: '8px 12px' } : undefined;
  return (
    <div className="crm-scroll" style={{ width: '100%', ...style }}>
      <table className="crm-table">
        <thead><tr>{columns.map(c => <th key={c.key} style={{ width: c.width, textAlign: c.align, ...pad }}>{c.label}</th>)}</tr></thead>
        <tbody>
          {loading && [0, 1, 2].map(i => <tr key={'s' + i}>{columns.map(c => <td key={c.key} style={pad}><CrmSkeleton height={14} width="70%" /></td>)}</tr>)}
          {!loading && rows.length === 0 && <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 32, color: 'var(--gray-500)' }}>{emptyText}</td></tr>}
          {!loading && rows.map(r => {
            const k = r[rowKey];
            const cls = [onRowClick && 'clickable', selectedId === k && 'is-selected', highlightIds.includes(k) && 'is-highlighted', r.disabled && 'is-disabled'].filter(Boolean).join(' ');
            return (
              <tr key={k} className={cls} onClick={onRowClick ? () => onRowClick(r) : undefined} aria-selected={selectedId === k || undefined}>
                {columns.map(c => <td key={c.key} className={c.strong ? 'strong' : undefined} style={{ textAlign: c.align, ...pad }}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export default CrmTable;
