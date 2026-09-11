export function startOfUtcDay(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('Invalid date');
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function endOfUtcDay(value = new Date()) {
  const date = startOfUtcDay(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

export function addUtcDays(value, days) {
  const date = startOfUtcDay(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export function businessDate(value = new Date(), timeZone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return startOfUtcDay(`${part('year')}-${part('month')}-${part('day')}`);
}
