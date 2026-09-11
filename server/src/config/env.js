import 'dotenv/config';
import Joi from 'joi';

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(5000),
  MONGODB_URI: Joi.string().required(),
  CLIENT_URL: Joi.string().uri().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  ENCRYPTION_KEY: Joi.string().length(64).hex().required(),
  LOG_LEVEL: Joi.string().default('info'),
  SMTP_HOST: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().email().default('no-reply@example.com'),
  FRONTEND_RESET_URL: Joi.string().uri().default('http://localhost:5173/reset-password'),
}).unknown();

const { value, error } = schema.validate(process.env, { abortEarly: false });
if (error) throw new Error(`Invalid environment configuration: ${error.message}`);

export const env = Object.freeze({
  nodeEnv: value.NODE_ENV,
  port: value.PORT,
  mongoUri: value.MONGODB_URI,
  clientUrl: value.CLIENT_URL,
  jwtAccessSecret: value.JWT_ACCESS_SECRET,
  jwtRefreshSecret: value.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: value.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: value.JWT_REFRESH_EXPIRES_IN,
  encryptionKey: value.ENCRYPTION_KEY,
  logLevel: value.LOG_LEVEL,
  smtpHost: value.SMTP_HOST || undefined,
  smtpPort: value.SMTP_PORT,
  smtpSecure: value.SMTP_SECURE,
  smtpUser: value.SMTP_USER,
  smtpPassword: value.SMTP_PASSWORD,
  mailFrom: value.MAIL_FROM,
  frontendResetUrl: value.FRONTEND_RESET_URL,
});
