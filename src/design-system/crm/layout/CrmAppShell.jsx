import React from 'react';
import { CrmGlobalNav } from './CrmGlobalNav.jsx';
import { CrmTopBar } from './CrmTopBar.jsx';

export function CrmAppShell({ active = 'home', onNavigate, navItems, navFooter, topBarProps = {}, children, height = '100vh', contentStyle }) {
  return (
    <div style={{ display: 'flex', height, minHeight: 0, background: 'var(--bg-app)', fontFamily: 'var(--font-sans)' }}>
      <CrmGlobalNav active={active} onNavigate={onNavigate} items={navItems} footer={navFooter} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <CrmTopBar {...topBarProps} />
        <main style={{ flex: 1, minHeight: 0, overflow: 'auto', ...contentStyle }}>{children}</main>
      </div>
    </div>
  );
}
export default CrmAppShell;
