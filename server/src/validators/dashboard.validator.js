import Joi from 'joi';
import { dateRangeQuery, objectId } from './common.validator.js';

export const dashboardQuerySchema = Joi.object({ ...dateRangeQuery, staff: objectId });
