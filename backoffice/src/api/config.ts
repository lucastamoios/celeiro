// Centralized API configuration
// Uses Vite environment variables (VITE_API_URL)
// Production: empty string, Caddy proxies /api/* to backend with path stripping
// Development: http://localhost:8080 (direct backend access, no /api prefix)

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const IS_PRODUCTION = !import.meta.env.VITE_API_URL;

// In production, all API calls go through /api/* which Caddy strips before proxying
// In development, we call the backend directly without the /api prefix
const API_PREFIX = IS_PRODUCTION ? '/api' : '';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  prefix: API_PREFIX,
  endpoints: {
    auth: {
      password: '/auth/password/',
    },
    accounts: {
      me: '/accounts/me/',
    },
    backoffice: {
      users: '/backoffice/users',
      invites: '/backoffice/invites',
    },
    systemInvites: {
      accept: '/system-invites/accept',
    },
  },
};

export const apiUrl = (path: string): string => `${API_CONFIG.baseURL}${API_PREFIX}${path}`;
