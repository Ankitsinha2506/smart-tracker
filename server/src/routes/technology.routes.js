import { Router } from 'express';
import { USER_ROLES } from '../constants/domain.constants.js';
import * as controller from '../controllers/technology.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createTechnologySchema,
  technologyIdSchema,
  updateTechnologySchema,
} from '../validators/technology.validator.js';

export const technologyRouter = Router();
technologyRouter.use(authenticate);
technologyRouter.get('/', controller.list);
technologyRouter.post(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.STAFF),
  validate(createTechnologySchema),
  controller.create,
);
technologyRouter.patch(
  '/:id',
  authorize(USER_ROLES.ADMIN),
  validate(technologyIdSchema, 'params'),
  validate(updateTechnologySchema),
  controller.update,
);
