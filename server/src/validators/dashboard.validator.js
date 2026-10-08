import Joi from 'joi';
import { dateRangeQuery, objectId } from './common.validator.js';

export const dashboardQuerySchema = Joi.object({
  ...dateRangeQuery,
  staff: objectId,
  allTime: Joi.boolean(),
  technology: objectId,
  status: Joi.string().valid('active', 'inactive', 'placed'),
  membershipType: Joi.string().valid('paid', 'free'),
});
