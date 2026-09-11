import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { sanitizeMongoOperators } from './middlewares/sanitize.middleware.js';
import { attachRequestId, enforceTrustedOrigin } from './middlewares/request.middleware.js';
import { apiRouter } from './routes/index.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(attachRequestId);
app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Authorization', 'Content-Type', 'X-Request-Id'],
    optionsSuccessStatus: 204,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));
app.use(cookieParser());
app.use(enforceTrustedOrigin);
app.use(sanitizeMongoOperators);
app.use(hpp());
app.use(compression());
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
