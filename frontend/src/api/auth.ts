import type { ApiResponse } from '../types/transaction';
import { API_CONFIG } from '../config/api';

interface RequestOptions {
  token: string;
  organizationId?: string;
}

/**
 * Helper function to create headers for authenticated API requests
 */
function createHeaders(options: RequestOptions): HeadersInit {
  if (!options.organizationId) {
    throw new Error('Organization ID is required - ensure activeOrganization is set');
  }
  return {
    'Authorization': `Bearer ${options.token}`,
    'X-Active-Organization': options.organizationId,
    'Content-Type': 'application/json',
  };
}

export interface AuthResponse {
  session_token: string;
  session_created_at: string;
  session_expires_at: string;
  is_new_user: boolean;
}

export interface SetPasswordResponse {
  message: string;
}

/**
 * Login with email and password
 */
export async function loginWithPassword(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.auth.password}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Credenciais inválidas');
  }

  const result: ApiResponse<AuthResponse> = await response.json();
  return result.data;
}

/**
 * Set or change password (requires authentication)
 */
export async function setPassword(
  oldPassword: string,
  newPassword: string,
  options: RequestOptions
): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.accounts.password}`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.error?.includes('credentials')) {
      throw new Error('Senha atual incorreta');
    }
    throw new Error(errorData.error || 'Falha ao atualizar senha');
  }
}
