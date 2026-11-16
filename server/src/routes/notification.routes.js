import { Router } from 'express';
import { objectId } from '../validators/common.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as controller from '../controllers/notification.controller.js';
import Joi from 'joi';

export const notificationRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.get('/', controller.list);
notificationRouter.patch('/read-all', controller.markAllRead);
notificationRouter.patch('/:id/read', validate(Joi.object({ id: objectId.required() }), 'params'), controller.markRead);
