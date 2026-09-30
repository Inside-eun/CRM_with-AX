import React from 'react';
import { Icon } from '../../icons/Icon.jsx';

const TONE_ICON = { info: 'Info', ai: 'Cpu', warning: 'AlertTriangle', danger: 'AlertOctagon', success: 'CheckCircle', neutral: null, purple: null };

export function CrmBadge({ tone = 'neutral', size = 'sm', icon, dot = false, square = false, showToneIcon = false, children, title, style }) {
  const ic = icon || (showToneIcon ? TONE_ICON[tone] : null);
  return (
    <span className={['crm-badge', tone, size, square && 'square'].filter(Boolean).join(' ')} title={title} style={style}>
      {dot && <span className="dot" aria-hidden="true" />}
      {ic && <Icon name={ic} size={size === 'md' ? 14 : 12} />}
      {children}
    </span>
  );
}
export default CrmBadge;
