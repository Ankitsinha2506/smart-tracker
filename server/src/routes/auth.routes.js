import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  changePasswordSchema,
  createUserSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateUserSchema,
  userIdSchema,
} from '../validators/auth.validator.js';

export const authRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts; try again later' },
});

authRouter.post('/login', authLimiter, validate(loginSchema), controller.login);
authRouter.post('/refresh', controller.refresh);
authRouter.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword,
);
authRouter.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword,
);
authRouter.use(authenticate);
authRouter.get('/me', controller.me);
authRouter.post('/logout', controller.logout);
authRouter.patch('/change-password', validate(changePasswordSchema), controller.changePassword);
authRouter.get('/users', authorize(controller.USER_ROLES.ADMIN), controller.listUsers);
authRouter.post(
  '/users',
  authorize(controller.USER_ROLES.ADMIN),
  validate(createUserSchema),
  controller.createUser,
);
authRouter.patch(
  '/users/:id',
  authorize(controller.USER_ROLES.ADMIN),
  validate(userIdSchema, 'params'),
  validate(updateUserSchema),
  controller.updateUser,
);
authRouter.delete(
  '/users/:id',
  authorize(controller.USER_ROLES.ADMIN),
  validate(userIdSchema, 'params'),
  controller.deleteUser,
);
