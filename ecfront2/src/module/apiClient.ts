import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// =================================================================
// Constants
// =================================================================
const TOKEN_URL = `/api/uam/token`; 
// Look for these keys in localStorage to prevent 401 errors
const ACCESS_TOKEN_KEYS = ['access_token', 'accessToken', 'mockten_access_token'];
const REFRESH_TOKEN_KEYS = ['refresh_token', 'refreshToken', 'mockten_refresh_token'];

// =================================================================
// Token Helpers
// =================================================================
export const getAccessToken = (): string | null => {
  for (const key of ACCESS_TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

export const getRefreshToken = (): string | null => {
  for (const key of REFRESH_TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  // Standardize the key name for future use
  localStorage.setItem('access_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
};

export const clearTokens = () => {
  ACCESS_TOKEN_KEYS.forEach(k => localStorage.removeItem(k));
  REFRESH_TOKEN_KEYS.forEach(k => localStorage.removeItem(k));
};

// =================================================================
// Axios Instance
// =================================================================
const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// =================================================================
// Request Interceptor
// =================================================================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =================================================================
// Response Interceptor
// =================================================================
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);

        const response = await axios.post(TOKEN_URL, params);
        
        // We trust the structure is the same as login
        const access_token = response.data.access_token;
        const refresh_token = response.data.refresh_token;

        setTokens(access_token, refresh_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        processQueue(null, access_token);
        return apiClient(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;