import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function attachRequestId(request, response, next) {
  const supplied = request.get('x-request-id');
  request.id =
    supplied && /^[A-Za-z0-9._-]{1,100}$/.test(supplied) ? supplied : crypto.randomUUID();
  response.set('X-Request-Id', request.id);
  next();
}

export function enforceTrustedOrigin(request, _response, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  const origin = request.get('origin');
  if (origin && origin !== env.clientUrl)
    return next(new ApiError(403, 'Request origin is not trusted'));
  next();
}
