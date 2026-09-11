export const USER_ROLES = Object.freeze({ ADMIN: 'admin', STAFF: 'staff', STUDENT: 'student' });
export const USER_STATUSES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOCKED: 'locked',
});
export const STUDENT_STATUSES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PLACED: 'placed',
});
export const MEMBERSHIP_TYPES = Object.freeze({ PAID: 'paid', FREE: 'free' });
export const REPORT_TYPES = Object.freeze({
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
});
export const REPORT_STATUSES = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
});
export const REPORT_FORMATS = Object.freeze({ CSV: 'csv', XLSX: 'xlsx', PDF: 'pdf' });
