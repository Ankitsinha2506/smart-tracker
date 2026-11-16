import { RecoveryCandidate } from '../models/RecoveryCandidate.js';
import { RecoverySetting } from '../models/RecoverySetting.js';
import { RecoveryAlertLog } from '../models/RecoveryAlertLog.js';
import { Technology } from '../models/Technology.js';
import { Student } from '../models/Student.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { sendPlainEmail } from './mail.service.js';
import { recoveryOwnerEmail, recoveryStudentEmail } from '../utils/emailTemplates.js';

const populated = (doc) => doc?.toJSON();
const logoUrl = `${env.clientUrl.replace(/\/$/, '')}/brand/smartapply-mark-dark.svg`;
const qrUrl = env.apiPublicUrl ? `${env.apiPublicUrl}/api/v1/bd-recovery/payment-qr` : '';
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
function withTotals(doc) {
  const paidAmount = doc.advancePaidAmount + (doc.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = Math.max(0, doc.totalAmount - paidAmount);
  const due = new Date(doc.dueDate); const now = new Date();
  const dueDate = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const status = pendingAmount === 0 ? 'Paid' : today > dueDate ? 'Overdue' : paidAmount > 0 ? 'Partially Paid' : 'Pending';
  return { ...doc, paidAmount, pendingAmount, status };
}
export async function listCandidates(query = {}) {
  const createdAtOrder = query.sortOrder === 'oldest' ? 1 : -1;
  const allCandidates = (await RecoveryCandidate.find().sort({ createdAt: createdAtOrder }).lean()).map(withTotals);
  let items = allCandidates;
  const totals = items.reduce((acc, item) => ({
    total: acc.total + item.totalAmount,
    paid: acc.paid + item.paidAmount,
    pending: acc.pending + item.pendingAmount,
    overdue: acc.overdue + (item.status === 'Overdue' ? 1 : 0),
    pendingCandidates: acc.pendingCandidates + (item.status === 'Pending' ? 1 : 0),
    partiallyPaid: acc.partiallyPaid + (item.status === 'Partially Paid' ? 1 : 0),
    paidCandidates: acc.paidCandidates + (item.status === 'Paid' ? 1 : 0),
  }), { total: 0, paid: 0, pending: 0, overdue: 0, pendingCandidates: 0, partiallyPaid: 0, paidCandidates: 0 });
  const monthMap = new Map();
  for (const item of items) {
    const key = new Date(item.selectedDate).toISOString().slice(0, 7);
    const month = monthMap.get(key) || { key, receivable: 0, collected: 0 };
    month.receivable += item.totalAmount;
    month.collected += item.paidAmount;
    monthMap.set(key, month);
  }
  const monthlyTrend = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(); date.setMonth(date.getMonth() - (5 - offset), 1);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return { ...(monthMap.get(key) || { key, receivable: 0, collected: 0 }), month: date.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }) };
  });
  const startOfToday = new Date(); startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfPeriod = new Date(startOfToday); endOfPeriod.setUTCDate(endOfPeriod.getUTCDate() + 30);
  const upcomingDue = allCandidates.filter((item) => item.pendingAmount > 0 && new Date(item.dueDate) <= endOfPeriod).sort((a, b) => {
    const overdueOrder = Number(a.status !== 'Overdue') - Number(b.status !== 'Overdue');
    return overdueOrder || new Date(a.dueDate) - new Date(b.dueDate);
  }).slice(0, 6);
  const recentPayments = allCandidates.flatMap((item) => [
    ...(item.advancePaidAmount > 0 ? [{ _id: `advance-${item._id}`, amount: item.advancePaidAmount, paidAt: item.createdAt, note: 'Initial advance', candidateId: item._id, name: item.name, surname: item.surname, mobile: item.mobile }] : []),
    ...(item.payments || []).map((payment) => ({ ...payment, candidateId: item._id, name: item.name, surname: item.surname, mobile: item.mobile })),
  ]).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)).slice(0, 8);
  const technologyBreakdown = Object.values(allCandidates.reduce((groups, item) => {
    const key = item.technology || 'Unspecified';
    const group = groups[key] || { technology: key, candidates: 0, receivable: 0, collected: 0, pending: 0 };
    group.candidates += 1; group.receivable += item.totalAmount; group.collected += item.paidAmount; group.pending += item.pendingAmount;
    groups[key] = group; return groups;
  }, {})).sort((a, b) => b.pending - a.pending).slice(0, 6);
  const companyBreakdown = Object.values(allCandidates.reduce((groups, item) => {
    const key = item.company || 'Unspecified';
    const group = groups[key] || { company: key, candidates: 0, receivable: 0, collected: 0, pending: 0 };
    group.candidates += 1; group.receivable += item.totalAmount; group.collected += item.paidAmount; group.pending += item.pendingAmount;
    groups[key] = group; return groups;
  }, {})).sort((a, b) => b.pending - a.pending).slice(0, 6);
  const search = String(query.search || '').trim().toLocaleLowerCase('en-IN');
  if (search) {
    const phoneSearch = search.replace(/\D/g, '');
    items = items.filter((item) => {
      const fullName = `${item.name || ''} ${item.surname || ''}`.trim().toLocaleLowerCase('en-IN');
      const mobile = String(item.mobile || '').replace(/\D/g, '');
      return fullName.includes(search) || (phoneSearch && mobile.includes(phoneSearch));
    });
  }
  if (query.technology) items = items.filter((item) => item.technology === query.technology);
  if (query.company) {
    const company = String(query.company).trim().toLocaleLowerCase('en-IN');
    items = items.filter((item) => String(item.company || '').toLocaleLowerCase('en-IN').includes(company));
  }
  if (query.status) items = items.filter((item) => item.status === query.status);
  if (query.dueDate) items = items.filter((item) => new Date(item.dueDate).toISOString().slice(0, 10) === query.dueDate);
  if (query.selectedFrom) items = items.filter((item) => new Date(item.selectedDate) >= new Date(`${query.selectedFrom}T00:00:00.000Z`));
  if (query.selectedTo) items = items.filter((item) => new Date(item.selectedDate) <= new Date(`${query.selectedTo}T23:59:59.999Z`));
  if (query.sortOrder === 'name_asc' || query.sortOrder === 'name_desc') {
    const direction = query.sortOrder === 'name_asc' ? 1 : -1;
    items = [...items].sort((left, right) => {
      const leftName = `${left.name || ''} ${left.surname || ''}`.trim();
      const rightName = `${right.name || ''} ${right.surname || ''}`.trim();
      return direction * leftName.localeCompare(rightName, 'en-IN', { sensitivity: 'base' });
    });
  }
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit, totals, monthlyTrend, upcomingDue, recentPayments, technologyBreakdown, companyBreakdown, technologies: await Technology.find({ isActive: true }).select('name').sort('name').lean() };
}
export async function importCandidates(rows, userId) {
  const mobiles = rows.map((row) => String(row.mobile)).filter((mobile) => mobile !== 'NA');
  const existing = new Set(await RecoveryCandidate.distinct('mobile', { mobile: { $in: mobiles } }));
  const seen = new Set(existing); const accepted = []; const results = [];
  for (const row of rows) {
    const sourceRow = Number(row.sourceRow) || 0;
    const mobile = String(row.mobile);
    if (mobile !== 'NA' && seen.has(mobile)) { results.push({ row: sourceRow, success: false, message: 'Duplicate mobile number; this candidate already exists or appears more than once.' }); continue; }
    const document = new RecoveryCandidate({
      name: row.name, surname: row.surname, mobile, email: row.email,
      technology: row.technology, selectedDate: row.selectedDate, company: row.company,
      totalAmount: row.totalAmount, advancePaidAmount: row.advancePaidAmount,
      dueDate: row.dueDate, createdBy: userId, updatedBy: userId,
    });
    try { await document.validate(); accepted.push({ document, sourceRow }); if (mobile !== 'NA') seen.add(mobile); }
    catch (error) { results.push({ row: sourceRow, success: false, message: error.message }); }
  }
  if (accepted.length) {
    const inserted = await RecoveryCandidate.insertMany(accepted.map(({ document }) => document));
    inserted.forEach((document, index) => results.push({ row: accepted[index].sourceRow, success: true, id: document._id }));
  }
  const ordered = results.sort((a, b) => a.row - b.row);
  const imported = ordered.filter((item) => item.success).length;
  return { imported, failed: ordered.length - imported, results: ordered };
}
export async function createCandidate(data, userId) { const doc = await RecoveryCandidate.create({ ...data, createdBy: userId, updatedBy: userId }); return populated(doc); }
export async function transferPlacedStudent(studentId, data, userId) {
  const student = await Student.findOne({ _id: studentId, status: 'placed', deletedAt: null }).populate('technology', 'name');
  if (!student) throw new ApiError(404, 'Placed candidate not found');
  const existing = await RecoveryCandidate.findOne({ sourceStudent: student._id });
  if (existing) throw new ApiError(409, 'This candidate has already been transferred to BD Recovery');
  const fullName = String(student.candidateName || '').trim();
  const [name, ...surnameParts] = fullName.split(/\s+/);
  const digits = String(student.mobileNumber || '').replace(/\D/g, '');
  try {
    const doc = await RecoveryCandidate.create({
      name: name || 'NA',
      surname: surnameParts.join(' ') || 'NA',
      mobile: digits.length >= 10 ? digits.slice(-10) : 'NA',
      email: student.personalEmail || '',
      technology: student.technology?.name || 'NA',
      selectedDate: student.placedAt || student.updatedAt || student.createdAt,
      company: data.company,
      totalAmount: data.totalAmount,
      advancePaidAmount: data.advancePaidAmount,
      dueDate: data.dueDate,
      sourceStudent: student._id,
      createdBy: userId,
      updatedBy: userId,
    });
    return populated(doc);
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.sourceStudent) throw new ApiError(409, 'This candidate has already been transferred to BD Recovery');
    throw error;
  }
}
export async function updateCandidate(id, data, userId) { const doc = await RecoveryCandidate.findById(id); if (!doc) return null; Object.assign(doc, data, { updatedBy: userId }); await doc.save(); return populated(doc); }
export async function deleteCandidate(id) { return RecoveryCandidate.findByIdAndDelete(id); }
export async function recordPayment(id, data, userId) { const doc = await RecoveryCandidate.findById(id); if (!doc) return null; doc.payments.push({ ...data, recordedBy: userId }); doc.updatedBy = userId; await doc.save(); return populated(doc); }
export async function getSettings() { return RecoverySetting.findOneAndUpdate({ key: 'bd-recovery' }, { $setOnInsert: { key: 'bd-recovery' } }, { new: true, upsert: true }); }
export async function updateSettings(data) { return RecoverySetting.findOneAndUpdate({ key: 'bd-recovery' }, { $set: data }, { new: true, upsert: true, runValidators: true }); }
async function providerRequest(to, body, channel, templateSid = '', templateVariables = '') {
  if (!env.twilioAccountSid || !env.twilioAuthToken) throw new Error('Twilio messaging is not configured on the server.');
  const sender = channel === 'whatsapp' ? env.twilioWhatsAppFrom : env.twilioFromNumber;
  if (!sender) throw new Error(channel === 'whatsapp' ? 'WhatsApp is not configured. Set TWILIO_WHATSAPP_FROM.' : 'SMS is not configured. Set TWILIO_FROM_NUMBER.');
  const prefix = channel === 'whatsapp' ? 'whatsapp:' : '';
  const toNumber = String(to).replace(/^whatsapp:/, '').startsWith('+') ? String(to).replace(/^whatsapp:/, '') : `+91${String(to).replace(/^whatsapp:/, '')}`;
  const fromNumber = String(sender).startsWith('whatsapp:') ? String(sender) : `${prefix}${sender}`;
  const form = new URLSearchParams({ To: `${prefix}${toNumber}`, From: fromNumber });
  if (channel === 'whatsapp' && templateSid) { form.set('ContentSid', templateSid); form.set('ContentVariables', templateVariables); }
  else form.set('Body', body);
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form, signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(`Twilio ${channel} delivery failed${result.code ? ` (${result.code})` : ''}: ${result.message || `HTTP ${response.status}`}`);
  }
}
async function logDelivery({ recipient, candidate, type, channel, message, html, templateSid = '', templateVariables = '' }) {
  try {
    if (channel === 'email') await sendPlainEmail(recipient, type === 'owner-summary' ? 'Monthly BD Recovery summary · SmartApply' : 'Payment reminder · SmartApply', message, html);
    else await providerRequest(recipient, message, channel, templateSid, templateVariables);
    return RecoveryAlertLog.create({ recipient, candidate, type, channel, message, html, whatsappContentSid: templateSid, whatsappContentVariables: templateVariables, status: 'Sent' });
  } catch (error) {
    return RecoveryAlertLog.create({ recipient, candidate, type, channel, message, html, whatsappContentSid: templateSid, whatsappContentVariables: templateVariables, status: 'Failed', error: error.message });
  }
}
function studentText(candidate) {
  return `Name : ${candidate.name} ${candidate.surname}\nTotal amt : ${money(candidate.totalAmount)}\nPaid amt : ${money(candidate.paidAmount)}\nPending amt : ${money(candidate.pendingAmount)}\nNote : Please pay on the QR code.${qrUrl ? `\nPayment QR: ${qrUrl}` : ''}`;
}
function ownerText(candidates) {
  const total = candidates.reduce((sum, c) => sum + c.totalAmount, 0); const paid = candidates.reduce((sum, c) => sum + c.paidAmount, 0); const pending = candidates.reduce((sum, c) => sum + c.pendingAmount, 0);
  const list = candidates.filter((c) => c.pendingAmount > 0).sort((a, b) => b.pendingAmount - a.pendingAmount);
  const message = `For Madam,\n\nTotal amount : ${money(total)}\nPaid amount : ${money(paid)}\nPending amount : ${money(pending)}\n\nSelected Candidates (pending list):\n${list.map((c, i) => `${i + 1}. ${c.name} ${c.surname} – Pending amt ${money(c.pendingAmount)}`).join('\n') || 'No pending candidates.'}`;
  return { message, list, total, paid, pending };
}
export async function sendAlerts({ type = 'all', channel = 'all', candidateId } = {}) {
  const settings = await getSettings();
  const raw = candidateId ? await RecoveryCandidate.find({ _id: candidateId }).lean() : await RecoveryCandidate.find().lean();
  const candidates = raw.map(withTotals); const logs = [];
  if (type === 'all' || type === 'students') for (const candidate of candidates.filter((item) => item.pendingAmount > 0)) {
    const message = studentText(candidate);
    const email = recoveryStudentEmail({ name: `${candidate.name} ${candidate.surname}`, total: candidate.totalAmount, paid: candidate.paidAmount, pending: candidate.pendingAmount, qrUrl, logoUrl });
    if (channel === 'all' || channel === 'email') logs.push(await logDelivery({ recipient: candidate.email || 'Email not provided', candidate: candidate._id, type: 'student-reminder', channel: 'email', message: email.text, html: email.html }));
    const variables = JSON.stringify({ 1: `${candidate.name} ${candidate.surname}`, 2: money(candidate.totalAmount), 3: money(candidate.paidAmount), 4: money(candidate.pendingAmount), 5: qrUrl || 'Please pay using the payment QR code.' });
    if (channel === 'all' || channel === 'whatsapp') logs.push(await logDelivery({ recipient: candidate.mobile, candidate: candidate._id, type: 'student-reminder', channel: 'whatsapp', message, html: '', templateSid: env.twilioWhatsAppStudentContentSid, templateVariables: variables }));
  }
  if (type === 'all' || type === 'owner') {
    const summary = ownerText(candidates); const pendingCandidates = summary.list.map((candidate) => ({ name: `${candidate.name} ${candidate.surname}`, pendingAmount: candidate.pendingAmount }));
    const email = recoveryOwnerEmail({ total: summary.total, paid: summary.paid, pending: summary.pending, candidates: pendingCandidates, logoUrl });
    if (settings.ownerEmail) logs.push(await logDelivery({ recipient: settings.ownerEmail, type: 'owner-summary', channel: 'email', message: email.text, html: email.html }));
    if (settings.ownerMobile) { const variables = JSON.stringify({ 1: money(summary.total), 2: money(summary.paid), 3: money(summary.pending), 4: summary.list.map((item, index) => `${index + 1}. ${item.name} ${item.surname} – Pending amt ${money(item.pendingAmount)}`).join('\n') || 'No pending candidates.' }); logs.push(await logDelivery({ recipient: settings.ownerMobile, type: 'owner-summary', channel: 'whatsapp', message: summary.message, html: '', templateSid: env.twilioWhatsAppOwnerContentSid, templateVariables: variables })); }
    if (!settings.ownerEmail && !settings.ownerMobile) logs.push(await RecoveryAlertLog.create({ recipient: 'Not configured', type: 'owner-summary', channel: 'email', message: summary.message, status: 'Failed', error: 'Configure an owner email or mobile in BD Recovery settings.' }));
  }
  return logs;
}
export async function retryAlert(id) {
  const log = await RecoveryAlertLog.findById(id); if (!log) return null;
  try {
    if (log.channel === 'email') await sendPlainEmail(log.recipient, log.type === 'owner-summary' ? 'Monthly BD Recovery summary · SmartApply' : 'Payment reminder · SmartApply', log.message, log.html);
    else await providerRequest(log.recipient, log.message, log.channel, log.whatsappContentSid || '', log.whatsappContentVariables || '');
    log.status = 'Sent'; log.error = '';
  } catch (error) { log.status = 'Failed'; log.error = error.message; }
  log.sentAt = new Date(); await log.save(); return log;
}
export async function listLogs() { return RecoveryAlertLog.find().sort({ sentAt: -1 }).limit(200).lean(); }
export async function runMonthlyAlerts() { const settings = await getSettings(); if (!settings.autoReminders) return; const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date()); const claim = await RecoverySetting.findOneAndUpdate({ key: 'bd-recovery', autoReminders: true, lastRunMonth: { $ne: month } }, { $set: { lastRunMonth: month } }); if (!claim) return; await sendAlerts(); }
