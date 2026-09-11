import Joi from 'joi';
import { dateRangeQuery, objectId, paginationQuery } from './common.validator.js';

export const historyQuerySchema = Joi.object({
  ...paginationQuery,
  ...dateRangeQuery,
  student: objectId,
  staff: objectId,
  sort: Joi.string()
    .valid('newest', 'oldest', 'applications_high', 'applications_low')
    .default('newest'),
});
