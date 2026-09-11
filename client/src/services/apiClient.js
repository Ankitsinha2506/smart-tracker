import axios from 'axios';

export const apiClient = axios.create({
  // Production uses Vercel's API proxy so the refresh cookie stays first-party.
  // Keep the configurable backend URL for local development.
  baseURL: import.meta.env.PROD
    ? '/api/v1'
    : import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRequest =
      original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    if (error.response?.status !== 401 || original?._retry || isAuthRequest)
      return Promise.reject(error);
    original._retry = true;
    refreshPromise ||= apiClient.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });
    const response = await refreshPromise;
    setAccessToken(response.data.data.accessToken);
    original.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
    return apiClient(original);
  },
);

export function getApiError(error, fallback = 'Something went wrong') {
  return (
    error.response?.data?.errors?.[0]?.message ||
    error.response?.data?.message ||
    error.message ||
    fallback
  );
}
