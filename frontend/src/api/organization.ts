import type { ApiResponse } from '../types/transaction';
import { API_CONFIG } from '../config/api';

interface RequestOptions {
  token: string;
  organizationId?: number;
}

function createHeaders(options: RequestOptions): HeadersInit {
  if (!options.organizationId) {
    throw new Error('Organization ID is required - ensure activeOrganization is set');
  }
  return {
    'Authorization': `Bearer ${options.token}`,
    'X-Active-Organization': String(options.organizationId),
    'Content-Type': 'application/json',
  };
}

// Types

export interface OrganizationMember {
  user_id: number;
  name: string;
  email: string;
  user_role: string;
  is_default: boolean;
  joined_at: string;
}

export interface OrganizationInvite {
  invite_id: number;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface AcceptInviteResponse {
  session_token: string;
  session_created_at: string;
  session_expires_at: string;
  is_new_user: boolean;
  session_info: {
    user: {
      id: number;
      name: string;
      email: string;
      has_password: boolean;
    };
    organizations: Array<{
      organization_id: number;
      name: string;
      user_role: string;
      is_default: boolean;
    }>;
  };
}

// API Functions

export async function getOrganizationMembers(
  organizationId: number,
  options: RequestOptions
): Promise<OrganizationMember[]> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.organizations.members(organizationId)}`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch members');
  }

  const result: ApiResponse<OrganizationMember[]> = await response.json();
  return result.data ?? [];
}

export async function setDefaultOrganization(
  organizationId: number,
  options: RequestOptions
): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.organizations.default}`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify({ organization_id: organizationId }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to set default organization');
  }
}

export interface Organization {
  organization_id: number;
  name: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number;
  longitude: number;
}

export async function updateOrganization(
  organizationId: number,
  data: { name: string },
  options: RequestOptions
): Promise<Organization> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.organizations.update(organizationId)}`,
    {
      method: 'PATCH',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update organization');
  }

  const result: ApiResponse<Organization> = await response.json();
  return result.data;
}

export async function getPendingInvites(
  organizationId: number,
  options: RequestOptions
): Promise<OrganizationInvite[]> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.organizations.invites(organizationId)}`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch invites');
  }

  const result: ApiResponse<OrganizationInvite[]> = await response.json();
  return result.data ?? [];
}

export async function createOrganizationInvite(
  organizationId: number,
  email: string,
  role: string,
  options: RequestOptions
): Promise<OrganizationInvite> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.organizations.invites(organizationId)}`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify({ email, role }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create invite');
  }

  const result: ApiResponse<OrganizationInvite> = await response.json();
  return result.data;
}

export async function cancelOrganizationInvite(
  organizationId: number,
  inviteId: number,
  options: RequestOptions
): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.organizations.cancelInvite(organizationId, inviteId)}`,
    {
      method: 'DELETE',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to cancel invite');
  }
}

export async function acceptOrganizationInvite(
  token: string
): Promise<AcceptInviteResponse> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.invites.accept}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Invalid or expired invite');
  }

  const result: ApiResponse<AcceptInviteResponse> = await response.json();
  return result.data;
}

export async function acceptSystemInvite(
  token: string
): Promise<AcceptInviteResponse> {
  const response = await fetch(
    `${API_CONFIG.baseURL}${API_CONFIG.endpoints.systemInvites.accept}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Invalid or expired invite');
  }

  const result: ApiResponse<AcceptInviteResponse> = await response.json();
  return result.data;
}

/**
 * Accept any type of invite (organization or system).
 * Tries organization invite first, then falls back to system invite.
 */
export async function acceptAnyInvite(
  token: string
): Promise<AcceptInviteResponse> {
  // Try organization invite first
  try {
    return await acceptOrganizationInvite(token);
  } catch {
    // If organization invite fails, try system invite
    return await acceptSystemInvite(token);
  }
}
