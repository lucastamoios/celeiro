export interface ApiResponse<T> {
  data: T;
  status: number;
  error?: string;
}

export interface SystemUser {
  user_id: number;
  name: string;
  email: string;
  created_at: string;
  has_password: boolean;
  organizations: SystemUserOrganization[];
}

export interface SystemUserOrganization {
  organization_id: number;
  organization_name: string;
  user_role: string;
}

export interface SystemInvite {
  invite_id: number;
  email: string;
  organization_name: string;
  created_at: string;
  expires_at: string;
}

export interface AuthResponse {
  session_token: string;
  session_info: SessionInfo;
  is_new_user: boolean;
}

export interface SessionInfo {
  user: UserInfo;
  organizations: OrganizationWithPermissions[];
}

export interface UserInfo {
  id: number;
  email: string;
  name: string;
  has_password: boolean;
}

export interface OrganizationWithPermissions {
  organization_id: number;
  name: string;
  user_role: string;
  is_default: boolean;
  permissions: string[];
}
