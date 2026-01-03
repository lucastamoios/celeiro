// Centralized API configuration
// Uses Vite environment variables (VITE_API_URL)
// Defaults to http://localhost:8080 for development

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
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

export const apiUrl = (path: string): string => `${API_CONFIG.baseURL}${path}`;
