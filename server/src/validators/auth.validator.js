import Joi from 'joi';

const email = Joi.string().email().lowercase().trim().max(254);
const password = Joi.string().min(8).max(128).pattern(/[a-z]/).pattern(/[A-Z]/).pattern(/[0-9]/);

export const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().default(false),
});
export const forgotPasswordSchema = Joi.object({ email: email.required() });
export const resetPasswordSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
  password: password.required(),
});
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password.required().invalid(Joi.ref('currentPassword')),
});
export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: email.required(),
  password: password.required(),
  role: Joi.string().valid('staff', 'student').required(),
  student: Joi.string()
    .hex()
    .length(24)
    .when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() }),
});
export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  role: Joi.string().valid('staff', 'student'),
  status: Joi.string().valid('active', 'inactive', 'locked'),
  student: Joi.string().hex().length(24).allow(null),
}).min(1);
export const userIdSchema = Joi.object({ id: Joi.string().hex().length(24).required() });
