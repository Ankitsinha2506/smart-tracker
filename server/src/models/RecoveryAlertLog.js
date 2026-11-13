import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  recipient: { type: String, required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'RecoveryCandidate' },
  type: { type: String, enum: ['student-reminder', 'owner-summary'], required: true },
  channel: { type: String, enum: ['sms', 'email', 'whatsapp'], required: true },
  message: { type: String, required: true },
  html: { type: String, default: '', maxlength: 150000 },
  whatsappContentSid: { type: String, default: '' },
  whatsappContentVariables: { type: String, default: '' },
  status: { type: String, enum: ['Sent', 'Failed'], required: true },
  error: { type: String, maxlength: 300 },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });
schema.index({ sentAt: -1 });
export const RecoveryAlertLog = mongoose.model('RecoveryAlertLog', schema);
