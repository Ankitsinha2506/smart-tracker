import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { USER_ROLES, USER_STATUSES } from '../constants/domain.constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.STUDENT,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUSES),
      default: USER_STATUSES.ACTIVE,
      index: true,
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', unique: true, sparse: true },
    refreshTokenHash: { type: String, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: Date,
    passwordChangedAt: Date,
    lastLoginAt: Date,
    failedLoginAttempts: { type: Number, default: 0, min: 0, select: false },
    lockedUntil: Date,
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

userSchema.index({ status: 1, role: 1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  this.passwordChangedAt = new Date();
});

userSchema.methods.verifyPassword = function verifyPassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.set('toJSON', {
  transform: (_document, value) => {
    delete value.passwordHash;
    delete value.refreshTokenHash;
    delete value.passwordResetTokenHash;
    delete value.__v;
    return value;
  },
});

export const User = mongoose.model('User', userSchema);
