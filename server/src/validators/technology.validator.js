import Joi from 'joi';
import { objectId } from './common.validator.js';

export const technologyIdSchema = Joi.object({ id: objectId.required() });
export const createTechnologySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  slug: Joi.string()
    .lowercase()
    .trim()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .required(),
  description: Joi.string().trim().max(500),
});
export const updateTechnologySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  slug: Joi.string()
    .lowercase()
    .trim()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: Joi.string().trim().allow('').max(500),
  isActive: Joi.boolean(),
}).min(1);
