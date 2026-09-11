import mongoose from 'mongoose';
import { MEMBERSHIP_TYPES, STUDENT_STATUSES } from '../constants/domain.constants.js';
import { decryptSecret, encryptSecret } from '../utils/encryption.js';

const encryptedSecretSchema = new mongoose.Schema(
  {
    value: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { _id: false },
);

const studentSchema = new mongoose.Schema(
  {
    candidateName: { type: String, required: true, trim: true, maxlength: 120, index: true },
    mobileNumber: { type: String, required: true, unique: true, trim: true },
    personalEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    technology: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Technology',
      required: true,
      index: true,
    },
    naukriEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    naukriCredential: { type: encryptedSecretSchema, required: true, select: false },
    membershipType: {
      type: String,
      enum: Object.values(MEMBERSHIP_TYPES),
      default: MEMBERSHIP_TYPES.FREE,
      index: true,
    },
    membershipPaidMonth: {
      type: String,
      trim: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    currentTotalApplicationCount: { type: Number, default: 0, min: 0 },
    previousDayApplicationCount: { type: Number, default: 0, min: 0 },
    todayApplicationCount: { type: Number, default: 0, min: 0 },
    lastApplicationUpdateDate: Date,
    status: {
      type: String,
      enum: Object.values(STUDENT_STATUSES),
      default: STUDENT_STATUSES.ACTIVE,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

studentSchema.index({ status: 1, technology: 1 });
studentSchema.index({ createdAt: -1 });
studentSchema.index({ currentTotalApplicationCount: -1 });
studentSchema.index({
  candidateName: 'text',
  personalEmail: 'text',
  naukriEmail: 'text',
});

studentSchema.pre('validate', function validateCountSnapshot() {
  if (this.currentTotalApplicationCount < this.previousDayApplicationCount) {
    this.invalidate(
      'currentTotalApplicationCount',
      'Current total cannot be less than the previous-day total',
    );
  }
  if (
    this.todayApplicationCount !==
    this.currentTotalApplicationCount - this.previousDayApplicationCount
  ) {
    this.invalidate(
      'todayApplicationCount',
      'Today count must equal current total minus previous-day total',
    );
  }
});

studentSchema.methods.setNaukriPassword = function setNaukriPassword(password) {
  this.naukriCredential = encryptSecret(password);
};

studentSchema.methods.getNaukriPassword = function getNaukriPassword() {
  return decryptSecret(this.naukriCredential);
};

studentSchema.set('toJSON', {
  transform: (_document, value) => {
    delete value.naukriCredential;
    delete value.__v;
    return value;
  },
});

export const Student = mongoose.model('Student', studentSchema);
