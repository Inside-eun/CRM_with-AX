import React from 'react';

const TONES = { gray: ['var(--gray-100)', 'var(--gray-600)'], blue: ['var(--brand-50)', 'var(--brand-700)'], teal: ['var(--teal-50)', 'var(--teal-700)'], orange: ['var(--warning-50)', 'var(--warning-700)'], purple: ['var(--purple-50)', 'var(--purple-700)'] };
const SIZES = { xs: [24, 10], sm: [32, 12], md: [40, 14], lg: [48, 16], xl: [56, 18] };
const STATUS = { online: 'var(--success-500)', away: 'var(--warning-500)', busy: 'var(--error-500)', offline: 'var(--gray-300)' };

export function CrmAvatar({ name = '', size = 'md', tone = 'gray', status, style }) {
  const [px, fs] = SIZES[size];
  const [bg, fg] = TONES[tone];
  const initials = name.trim().slice(0, name.match(/[가-힣]/) ? 1 : 2).toUpperCase();
  return (
    <span style={{ position: 'relative', width: px, height: px, flex: 'none', borderRadius: '50%', background: bg, color: fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `600 ${fs}px/1 var(--font-sans)`, boxShadow: 'inset 0 0 0 1px rgba(16,24,40,0.08)', ...style }} aria-label={name}>
      {initials}
      {status && <span style={{ position: 'absolute', right: 0, bottom: 0, width: px / 4, height: px / 4, minWidth: 8, minHeight: 8, borderRadius: '50%', background: STATUS[status], border: '1.5px solid #fff' }} />}
    </span>
  );
}
export default CrmAvatar;
