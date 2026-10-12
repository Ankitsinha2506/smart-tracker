export function readAuthResponse(response) {
  const body = response?.data;
  if (!body || typeof body !== 'object' || body.success !== true || !body.data) {
    throw new Error('Sign-in service returned an invalid response. Please contact your administrator.');
  }
  const data = body.data;
  if (typeof data.accessToken !== 'string' || !data.accessToken || !data.user?._id) {
    throw new Error('Sign-in service returned an incomplete response. Please contact your administrator.');
  }
  return data;
}
