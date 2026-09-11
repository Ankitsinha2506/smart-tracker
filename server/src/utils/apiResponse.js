export function sendSuccess(
  response,
  { statusCode = 200, message = 'Success', data = null, meta },
) {
  return response.status(statusCode).json({ success: true, message, data, ...(meta && { meta }) });
}
