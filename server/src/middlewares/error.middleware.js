import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export function notFoundHandler(request, _response, next) {
  const error = new Error(`Route not found: ${request.method} ${request.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, request, response, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message;
  let details = error.details;
  if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${error.path}`;
  } else if (error.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }
  if (statusCode >= 500) logger.error(error.message, { stack: error.stack, path: request.path });
  response.status(statusCode).json({
    success: false,
    message: statusCode === 500 && env.nodeEnv === 'production' ? 'Internal server error' : message,
    ...(details && { errors: details }),
    ...(env.nodeEnv === 'development' && { stack: error.stack }),
  });
}
