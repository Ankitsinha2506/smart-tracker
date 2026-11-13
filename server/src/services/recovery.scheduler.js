import { runMonthlyAlerts } from './recovery.service.js';
import { logger } from '../config/logger.js';

export function startRecoveryScheduler() {
  const check = async () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const local = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    if (local.day === '01' && Number(local.hour) >= 9) {
      try { await runMonthlyAlerts(); } catch (error) { logger.error('BD Recovery scheduled alert failed', { error }); }
    }
  };
  void check();
  return setInterval(check, 60_000);
}
