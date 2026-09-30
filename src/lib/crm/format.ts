import type { Order } from "./types";

const DAY = 24 * 60 * 60 * 1000;
export const RETURN_WINDOW_DAYS = 7;
export const RETURN_SHIPPING_FEE = 6000;

const pad = (n: number) => String(n).padStart(2, "0");

/** 오늘 기준 n일 전(음수면 n일 후) 시각의 ISO 문자열 */
export function isoDaysAgo(days: number, hour = 14, minute = 0, now = new Date()): string {
  const d = new Date(now.getTime() - days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// "YYYY-MM-DD"(date input 값)는 UTC로 해석되지 않도록 현지 날짜로 읽습니다.
function toDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

export function fmtDate(iso: string): string {
  const d = toDate(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function fmtShortDate(iso: string): string {
  const d = toDate(iso);
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

export function fmtToday(now = new Date()): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

/** 초 → mm:ss (1시간 이상이면 h:mm:ss) */
export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

export function fmtWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 두 시각 사이의 달력 일수 (b - a) */
export function calendarDaysBetween(aIso: string, b = new Date()): number {
  const a = new Date(aIso);
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((b0 - a0) / DAY);
}

export function returnDeadline(order: Order): string | undefined {
  if (!order.deliveredAt) return undefined;
  return new Date(new Date(order.deliveredAt).getTime() + RETURN_WINDOW_DAYS * DAY).toISOString();
}

/** 반품 가능 남은 일수. 0이면 오늘까지, 음수면 기간 경과 */
export function returnDaysLeft(order: Order, now = new Date()): number | undefined {
  const deadline = returnDeadline(order);
  if (!deadline) return undefined;
  return -calendarDaysBetween(deadline, now);
}

export function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})-\d{3,4}-(\d{4})$/, "$1-****-$2");
}

export function maskEmail(email: string): string {
  const [id, domain] = email.split("@");
  return `${id.slice(0, 2)}****@${domain}`;
}

/** "현대카드 1127" → "현대카드 ****" */
export function maskPay(method: string): string {
  return method.replace(/\d{4}/g, "****");
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function receiptNo(prefix: string): string {
  return `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
}
