import axios from 'axios';
import { readAuthResponse } from './authResponse.js';

export const apiClient = axios.create({
  // Vercel uses a same-origin proxy; other hosts can supply a direct backend URL.
  baseURL: import.meta.env.PROD
    ? import.meta.env.VITE_API_BASE_URL || '/api/v1'
    : import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
let refreshPromise = null;
let sessionExpiryDispatched = false;

function notifySessionExpired() {
  accessToken = null;
  if (sessionExpiryDispatched) return;
  sessionExpiryDispatched = true;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:session-expired'));
}

export function setAccessToken(token) {
  accessToken = token;
  if (token) sessionExpiryDispatched = false;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && /^\s*(?:<!doctype html|<html)/i.test(response.data)) {
      throw new Error('The sign-in service is unavailable. Please contact your administrator.');
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    const isAuthRequest = ['/auth/login', '/auth/refresh', '/auth/logout']
      .some((path) => original?.url?.includes(path));
    if (error.response?.status !== 401 || isAuthRequest) return Promise.reject(error);
    if (original?._retry) {
      notifySessionExpired();
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      refreshPromise ||= apiClient.post('/auth/refresh').finally(() => {
        refreshPromise = null;
      });
      const data = readAuthResponse(await refreshPromise);
      setAccessToken(data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      if ([401, 403].includes(refreshError.response?.status)) notifySessionExpired();
      return Promise.reject(refreshError);
    }
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
