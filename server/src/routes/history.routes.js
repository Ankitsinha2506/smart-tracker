import { Router } from 'express';
import { list } from '../controllers/history.controller.js';
import { USER_ROLES } from '../constants/domain.constants.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { historyQuerySchema } from '../validators/history.validator.js';

export const historyRouter = Router();
historyRouter.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.STUDENT));
historyRouter.get('/', validate(historyQuerySchema, 'query'), list);
