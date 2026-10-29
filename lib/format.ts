const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatDate = (v?: string | Date | null) => (v ? dateFmt.format(new Date(v)) : '—');
export const formatDateTime = (v?: string | Date | null) => (v ? dateTimeFmt.format(new Date(v)) : '—');

export function formatMoney(amount: string | number | null | undefined, currency: string | null | undefined) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  try {
    return currency ? new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(n) : n.toFixed(2);
  } catch {
    return `${n.toFixed(2)} ${currency ?? ''}`.trim();
  }
}

export const isOverdue = (due?: string | null) => !!due && new Date(due).getTime() < Date.now();

export function timeAgo(v: string | Date) {
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return formatDate(v);
}
