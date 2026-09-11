function sanitize(value) {
  if (Array.isArray(value)) {
    value.forEach(sanitize);
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete value[key];
    } else {
      sanitize(value[key]);
    }
  }
}

export function sanitizeMongoOperators(request, _response, next) {
  sanitize(request.body);
  sanitize(request.params);
  const safeQuery = request.query;
  sanitize(safeQuery);
  Object.defineProperty(request, 'query', {
    value: safeQuery,
    configurable: true,
    enumerable: true,
  });
  next();
}
