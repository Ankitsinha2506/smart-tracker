import { ApiError } from '../utils/ApiError.js';

export const validate =
  (schema, source = 'body') =>
  (request, _response, next) => {
    const { value, error } = schema.validate(request[source], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });
    if (error) {
      return next(
        new ApiError(
          422,
          'Validation failed',
          error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        ),
      );
    }
    if (source === 'query') {
      Object.defineProperty(request, 'query', { value, configurable: true, enumerable: true });
    } else {
      request[source] = value;
    }
    next();
  };
