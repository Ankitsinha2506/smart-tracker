import Joi from 'joi';
import { dateRangeQuery, objectId, paginationQuery } from './common.validator.js';

const fields = {
  candidateName: Joi.string().trim().min(2).max(120),
  mobileNumber: Joi.string()
    .trim()
    .pattern(/^\+?[1-9]\d{7,14}$/),
  personalEmail: Joi.string().email().lowercase().trim().max(254),
  technology: objectId,
  naukriEmail: Joi.string().email().lowercase().trim().max(254),
  naukriPassword: Joi.string().min(6).max(256),
  membershipType: Joi.string().valid('paid', 'free'),
  membershipPaidMonth: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/),
  currentTotalApplicationCount: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'inactive', 'placed'),
};

export const createStudentSchema = Joi.object({
  candidateName: fields.candidateName.required(),
  mobileNumber: fields.mobileNumber.required(),
  personalEmail: fields.personalEmail.required(),
  technology: fields.technology.required(),
  naukriEmail: fields.naukriEmail.required(),
  naukriPassword: fields.naukriPassword.required(),
  membershipType: fields.membershipType.default('free'),
  membershipPaidMonth: Joi.when('membershipType', {
    is: 'paid',
    then: fields.membershipPaidMonth.required(),
    otherwise: Joi.forbidden(),
  }),
  currentTotalApplicationCount: fields.currentTotalApplicationCount.default(0),
  status: fields.status.default('active'),
});

export const updateStudentSchema = Joi.object({
  candidateName: fields.candidateName,
  mobileNumber: fields.mobileNumber,
  personalEmail: fields.personalEmail,
  technology: fields.technology,
  naukriEmail: fields.naukriEmail,
  naukriPassword: fields.naukriPassword,
  membershipType: fields.membershipType,
  membershipPaidMonth: fields.membershipPaidMonth,
  status: fields.status,
}).min(1);

export const updateApplicationCountSchema = Joi.object({
  currentTotalApplicationCount: fields.currentTotalApplicationCount.required(),
  note: Joi.string().trim().max(500),
});

export const studentIdSchema = Joi.object({ id: objectId.required() });

export const listStudentsSchema = Joi.object({
  ...paginationQuery,
  ...dateRangeQuery,
  search: Joi.string().trim().max(120),
  technology: objectId,
  staff: objectId,
  membershipType: fields.membershipType,
  status: fields.status,
  minApplications: Joi.number().integer().min(0),
  maxApplications: Joi.number().integer().min(Joi.ref('minApplications')),
  countFrom: Joi.date().iso(),
  countTo: Joi.date().iso().min(Joi.ref('countFrom')),
  sort: Joi.string()
    .valid('name_asc', 'name_desc', 'applications_high', 'applications_low', 'newest', 'oldest')
    .default('newest'),
});

export const importStudentsSchema = Joi.object({
  rows: Joi.array()
    .items(
      Joi.object({
        candidateName: Joi.any(),
        mobileNumber: Joi.any(),
        personalEmail: Joi.any(),
        technology: Joi.any(),
        naukriEmail: Joi.any(),
        naukriPassword: Joi.any(),
        membershipType: Joi.any(),
        membershipPaidMonth: Joi.any(),
        currentTotalApplicationCount: Joi.any(),
        status: Joi.any(),
        sourceRow: Joi.number().integer().min(2).required(),
      }),
    )
    .min(1)
    .max(200)
    .required(),
});

export const dailyMatrixSchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso().min(Joi.ref('from')),
  staff: objectId,
  search: Joi.string().trim().max(120),
  technology: objectId,
  status: fields.status,
});
