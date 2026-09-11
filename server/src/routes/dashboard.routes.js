import { Router } from 'express';
import { USER_ROLES } from '../constants/domain.constants.js';
import { overview } from '../controllers/dashboard.controller.js';
import * as studentController from '../controllers/student.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { dashboardQuerySchema } from '../validators/dashboard.validator.js';
import { dailyMatrixSchema } from '../validators/student.validator.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.STAFF));
dashboardRouter.get('/', validate(dashboardQuerySchema, 'query'), overview);
dashboardRouter.get(
  '/daily-matrix',
  validate(dailyMatrixSchema, 'query'),
  studentController.getDailyMatrix,
);

