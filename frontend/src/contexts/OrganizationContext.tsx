import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { API_CONFIG } from '../config/api';

// Types matching backend response structure
export interface Organization {
  organization_id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number;
  longitude: number;
  user_role: string;
  user_permissions: string[];
  is_default: boolean;
}

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  has_password: boolean;
}

interface SessionInfo {
  user: UserInfo;
  organizations: Organization[];
}

interface OrganizationContextType {
  organizations: Organization[];
  activeOrganization: Organization | null;
  userInfo: UserInfo | null;
  isLoading: boolean;
  error: string | null;
  setActiveOrganization: (org: Organization) => void;
  refreshSession: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const ACTIVE_ORG_STORAGE_KEY = 'active_organization_id';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated, logout } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganizationState] = useState<Organization | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch session info from /accounts/me
  const fetchSession = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.accounts.me}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1', // Will be ignored for fetching session
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, logout
          logout();
          return;
        }
        throw new Error('Failed to fetch session info');
      }

      const data = await response.json();
      const sessionInfo: SessionInfo = data.data;

      setUserInfo(sessionInfo.user);
      setOrganizations(sessionInfo.organizations);

      // Determine active organization:
      // 1. Try to restore from localStorage
      // 2. Fall back to default organization
      // 3. Fall back to first organization
      const storedOrgId = localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
      let activeOrg: Organization | null = null;

      if (storedOrgId) {
        activeOrg = sessionInfo.organizations.find(
          (org) => org.organization_id === parseInt(storedOrgId, 10)
        ) || null;
      }

      if (!activeOrg) {
        activeOrg = sessionInfo.organizations.find((org) => org.is_default) || null;
      }

      if (!activeOrg && sessionInfo.organizations.length > 0) {
        activeOrg = sessionInfo.organizations[0];
      }

      if (activeOrg) {
        setActiveOrganizationState(activeOrg);
        localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(activeOrg.organization_id));
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  // Fetch session on mount and when token changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchSession();
    } else {
      // Clear state on logout
      setOrganizations([]);
      setActiveOrganizationState(null);
      setUserInfo(null);
      setIsLoading(false);
      localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }
  }, [isAuthenticated, fetchSession]);

  // Set active organization and persist to localStorage
  const setActiveOrganization = useCallback((org: Organization) => {
    setActiveOrganizationState(org);
    localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(org.organization_id));
  }, []);

  // Refresh session (useful after accepting invite)
  const refreshSession = useCallback(async () => {
    await fetchSession();
  }, [fetchSession]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeOrganization,
        userInfo,
        isLoading,
        error,
        setActiveOrganization,
        refreshSession,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

/**
 * Hook to get the active organization ID for API calls.
 * Returns the organization ID as a number (matching backend expectations).
 */
export function useActiveOrganizationId(): number | null {
  const { activeOrganization } = useOrganization();
  return activeOrganization?.organization_id ?? null;
}
