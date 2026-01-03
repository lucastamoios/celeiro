// Centralized API configuration
// Uses Vite environment variables (VITE_API_URL)
// Defaults to empty string for relative URLs (proxied by nginx in Docker)

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  endpoints: {
    auth: {
      request: '/auth/request/',
      validate: '/auth/validate/',
      password: '/auth/password/',
    },
    accounts: {
      me: '/accounts/me/',
      password: '/accounts/password/',
    },
    organizations: {
      default: '/organizations/default',
      members: (orgId: number) => `/organizations/${orgId}/members`,
      invites: (orgId: number) => `/organizations/${orgId}/invites`,
      cancelInvite: (orgId: number, inviteId: number) => `/organizations/${orgId}/invites/${inviteId}`,
    },
    invites: {
      accept: '/invites/accept',
    },
    financial: {
      categories: '/financial/categories',
      accounts: '/financial/accounts',
      transactions: '/financial/transactions',
      budgets: '/financial/budgets',
    },
  },
};

/**
 * Helper function to build full API URLs
 * @param path - API endpoint path (e.g., '/auth/request/' or '/financial/budgets')
 * @returns Full URL with base URL prepended
 */
export const apiUrl = (path: string): string => `${API_CONFIG.baseURL}${path}`;

/**
 * Helper function to build financial API URLs
 * @param resource - Resource name (e.g., 'budgets', 'categories', 'transactions')
 * @param id - Optional resource ID
 * @returns Full URL for financial endpoint
 */
export const financialUrl = (resource: string, id?: string): string => {
  const base = `${API_CONFIG.baseURL}/financial/${resource}`;
  return id ? `${base}/${id}` : base;
};
