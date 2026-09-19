export function formatPrice(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function toDateInput(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
}

export function formatBookingDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function durationMinutes(departure: string | null | undefined, arrival: string | null | undefined): string {
  if (!departure || !arrival) return '—';
  const [h1, m1] = departure.split(':').map(Number);
  const [h2, m2] = arrival.split(':').map(Number);
  let mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'confirmed':
    case 'completed':
    case 'paid':
    case 'scheduled':
      return '#16a34a';
    case 'pending':
      return '#d97706';
    case 'cancelled':
    case 'failed':
    case 'inactive':
      return '#dc2626';
    default:
      return '#64748b';
  }
}
