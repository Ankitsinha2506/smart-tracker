import { Router } from 'express';
import { list } from '../controllers/history.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { historyQuerySchema } from '../validators/history.validator.js';

export const historyRouter = Router();
historyRouter.use(authenticate);
historyRouter.get('/', validate(historyQuerySchema, 'query'), list);
