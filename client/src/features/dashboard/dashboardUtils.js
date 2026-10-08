export const formatNumber = (value) =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 });
export const formatDate = (value, options = {}) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        timeZone: 'Asia/Kolkata',
        ...options,
      })
    : '—';
export const businessToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const percent = (value, total) => (total ? Math.round((value / total) * 100) : 0);
export const presets = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['last7', 'Last 7 days'],
  ['last30', 'Last 30 days'],
  ['thisMonth', 'This month'],
  ['lastMonth', 'Last month'],
  ['thisYear', 'This year'],
  ['allTime', 'All time'],
  ['custom', 'Custom'],
];
export function presetRange(preset) {
  const today = new Date(`${businessToday()}T00:00:00Z`);
  const end = new Date(today);
  const start = new Date(today);
  if (preset === 'allTime') return { from: '', to: '', allTime: true };
  if (preset === 'yesterday') {
    start.setUTCDate(start.getUTCDate() - 1);
    end.setUTCDate(end.getUTCDate() - 1);
  }
  if (preset === 'last7') start.setUTCDate(start.getUTCDate() - 6);
  if (preset === 'last30') start.setUTCDate(start.getUTCDate() - 29);
  if (preset === 'thisMonth') start.setUTCDate(1);
  if (preset === 'lastMonth') {
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - 1);
    end.setUTCDate(0);
  }
  if (preset === 'thisYear') {
    start.setUTCMonth(0, 1);
  }
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    allTime: false,
  };
}
export function comparison(current, previous) {
  if (current == null || previous == null) return null;
  if (!previous)
    return current
      ? { label: 'New activity', positive: true }
      : { label: 'No change', positive: true };
  const value = ((current - previous) / previous) * 100;
  return { label: `${value > 0 ? '+' : ''}${value.toFixed(1)}%`, positive: value >= 0 };
}
export function downloadFile(name, content, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows) {
  // Prevent spreadsheet formula execution for user-controlled cells.
  return (
    '\ufeff' +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? '');
            return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`;
          })
          .join(','),
      )
      .join('\r\n')
  );
}
export function bucketTrend(rows, mode) {
  if (mode === 'daily') return rows;
  const buckets = new Map();
  rows.forEach((row) => {
    const date = new Date(`${row.date.slice(0, 10)}T00:00:00Z`);
    if (mode === 'weekly') date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    else date.setUTCDate(1);
    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.get(key) || { date: key, applications: 0, candidates: 0, cumulative: 0 };
    bucket.applications += row.applications || 0;
    bucket.candidates += row.candidates || 0;
    bucket.cumulative = row.cumulative;
    buckets.set(key, bucket);
  });
  return [...buckets.values()];
}
