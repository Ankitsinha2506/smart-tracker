import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  key: { type: String, default: 'bd-recovery', unique: true },
  ownerEmail: { type: String, trim: true, lowercase: true, default: '' },
  ownerMobile: { type: String, trim: true, default: '' },
  qrCode: { type: String, default: '' },
  autoReminders: { type: Boolean, default: true },
  lastRunMonth: { type: String, default: '' },
}, { timestamps: true });
export const RecoverySetting = mongoose.model('RecoverySetting', schema);
