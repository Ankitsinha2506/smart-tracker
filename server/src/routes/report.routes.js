import { Router } from 'express';
import { USER_ROLES } from '../constants/domain.constants.js';
import * as controller from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createReportSchema, listReportsSchema } from '../validators/report.validator.js';

export const reportRouter = Router();
reportRouter.use(authenticate, authorize(USER_ROLES.ADMIN));
reportRouter.get('/', validate(listReportsSchema, 'query'), controller.list);
reportRouter.post('/generate', validate(createReportSchema), controller.generate);
