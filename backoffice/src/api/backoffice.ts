import { API_CONFIG, apiUrl } from './config';
import type { ApiResponse, SystemUser, SystemInvite, AuthResponse } from '../types/api';

interface RequestOptions {
  token: string;
}

function createHeaders(options: RequestOptions): HeadersInit {
  return {
    'Authorization': `Bearer ${options.token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Login with email and password
 */
export async function loginWithPassword(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(
    apiUrl(API_CONFIG.endpoints.auth.password),
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
 * Get current user info
 */
export async function getMe(options: RequestOptions): Promise<ApiResponse<AuthResponse>> {
  const response = await fetch(
    apiUrl(API_CONFIG.endpoints.accounts.me),
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get user info');
  }

  return response.json();
}

/**
 * Get all users (backoffice)
 */
export async function getAllUsers(options: RequestOptions): Promise<SystemUser[]> {
  const response = await fetch(
    apiUrl(API_CONFIG.endpoints.backoffice.users),
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get users');
  }

  const result: ApiResponse<SystemUser[]> = await response.json();
  return result.data ?? [];
}

/**
 * Get pending system invites (backoffice)
 */
export async function getPendingInvites(options: RequestOptions): Promise<SystemInvite[]> {
  const response = await fetch(
    apiUrl(API_CONFIG.endpoints.backoffice.invites),
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get invites');
  }

  const result: ApiResponse<SystemInvite[]> = await response.json();
  return result.data ?? [];
}

/**
 * Create system invite (backoffice)
 */
export async function createSystemInvite(
  email: string,
  organizationName: string,
  options: RequestOptions
): Promise<SystemInvite> {
  const response = await fetch(
    apiUrl(API_CONFIG.endpoints.backoffice.invites),
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify({
        email,
        organization_name: organizationName,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create invite');
  }

  const result: ApiResponse<SystemInvite> = await response.json();
  return result.data;
}

/**
 * Accept system invite (public)
 */
export async function acceptSystemInvite(token: string): Promise<AuthResponse> {
  const response = await fetch(
    apiUrl(API_CONFIG.endpoints.systemInvites.accept),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to accept invite');
  }

  const result: ApiResponse<AuthResponse> = await response.json();
  return result.data;
}
