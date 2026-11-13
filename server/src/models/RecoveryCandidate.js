import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0.01 },
  paidAt: { type: Date, default: Date.now },
  note: { type: String, trim: true, maxlength: 500 },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  surname: { type: String, required: true, trim: true, maxlength: 120 },
  mobile: { type: String, required: true, match: /^\d{10}$/ },
  email: { type: String, lowercase: true, trim: true, maxlength: 254 },
  technology: { type: String, required: true, trim: true, maxlength: 100 },
  selectedDate: { type: Date, required: true },
  company: { type: String, required: true, trim: true, maxlength: 160 },
  totalAmount: { type: Number, required: true, min: 0 },
  advancePaidAmount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true, default: () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); } },
  payments: { type: [paymentSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.pre('validate', function validatePaid() {
  if (this.advancePaidAmount > this.totalAmount) this.invalidate('advancePaidAmount', 'Advance paid cannot exceed total amount');
  if (this.payments.reduce((sum, payment) => sum + payment.amount, 0) + this.advancePaidAmount > this.totalAmount) this.invalidate('payments', 'Paid amount cannot exceed total amount');
});
schema.virtual('paidAmount').get(function paidAmount() { return this.advancePaidAmount + this.payments.reduce((sum, payment) => sum + payment.amount, 0); });
schema.virtual('pendingAmount').get(function pendingAmount() { return Math.max(0, this.totalAmount - this.paidAmount); });
schema.virtual('status').get(function status() {
  if (this.pendingAmount <= 0) return 'Paid';
  if (new Date() > this.dueDate) return 'Overdue';
  if (this.paidAmount > 0) return 'Partially Paid';
  return 'Pending';
});
schema.set('toJSON', { virtuals: true, transform: (_doc, value) => { delete value.__v; return value; } });
export const RecoveryCandidate = mongoose.model('RecoveryCandidate', schema);
