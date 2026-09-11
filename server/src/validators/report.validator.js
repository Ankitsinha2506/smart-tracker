import Joi from 'joi';
import { objectId, paginationQuery } from './common.validator.js';

export const createReportSchema = Joi.object({
  name: Joi.string().trim().min(2).max(160).required(),
  type: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'custom').required(),
  format: Joi.string().valid('csv', 'xlsx', 'pdf').required(),
  from: Joi.date().iso().required(),
  to: Joi.date().iso().min(Joi.ref('from')).required(),
  filters: Joi.object({
    technologies: Joi.array().items(objectId).max(50),
    membershipType: Joi.string().valid('paid', 'free'),
    studentStatus: Joi.string().valid('active', 'inactive', 'placed'),
  }).default({}),
});
export const listReportsSchema = Joi.object({
  ...paginationQuery,
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed'),
});
