import { Router } from 'express';
import * as controller from '../controllers/student.controller.js';
import { USER_ROLES } from '../constants/domain.constants.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createStudentSchema,
  importStudentsSchema,
  listStudentsSchema,
  studentIdSchema,
  updateApplicationCountSchema,
  updateStudentSchema,
} from '../validators/student.validator.js';

export const studentRouter = Router();
studentRouter.use(authenticate);
studentRouter.get('/me', authorize(USER_ROLES.STUDENT), controller.getMine);
studentRouter.patch(
  '/me/application-count',
  authorize(USER_ROLES.STUDENT),
  validate(updateApplicationCountSchema),
  controller.updateCount,
);
studentRouter.get(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.STAFF),
  validate(listStudentsSchema, 'query'),
  controller.list,
);
studentRouter.post(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.STAFF),
  validate(createStudentSchema),
  controller.create,
);
studentRouter.post(
  '/import',
  authorize(USER_ROLES.ADMIN, USER_ROLES.STAFF),
  validate(importStudentsSchema),
  controller.importStudents,
);
studentRouter.get(
  '/:id/naukri-credential',
  authorize(USER_ROLES.ADMIN, USER_ROLES.STAFF),
  validate(studentIdSchema, 'params'),
  controller.getNaukriCredential,
);
studentRouter.get('/:id', validate(studentIdSchema, 'params'), controller.getOne);
studentRouter.patch(
  '/:id/application-count',
  validate(studentIdSchema, 'params'),
  validate(updateApplicationCountSchema),
  controller.updateCount,
);
studentRouter.patch(
  '/:id',
  authorize(USER_ROLES.ADMIN, USER_ROLES.STAFF),
  validate(studentIdSchema, 'params'),
  validate(updateStudentSchema),
  controller.update,
);
studentRouter.delete(
  '/:id',
  authorize(USER_ROLES.ADMIN, USER_ROLES.STAFF),
  validate(studentIdSchema, 'params'),
  controller.remove,
);
