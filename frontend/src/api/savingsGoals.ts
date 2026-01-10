import type {
  SavingsGoal,
  SavingsGoalProgress,
  SavingsGoalDetail,
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  AddContributionRequest,
  ListSavingsGoalsFilters,
} from '../types/savingsGoals';
import type { ApiResponse } from '../types/transaction';
import { API_CONFIG } from '../config/api';

interface RequestOptions {
  token: string;
  organizationId?: string;
}

/**
 * Helper function to create headers for API requests
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

// =============================================================================
// Savings Goals API
// =============================================================================

/**
 * List all savings goals with optional filters
 */
export async function listSavingsGoals(
  filters: ListSavingsGoalsFilters = {},
  options: RequestOptions
): Promise<SavingsGoal[]> {
  const params = new URLSearchParams();

  if (filters.is_active !== undefined) {
    params.set('is_active', String(filters.is_active));
  }
  if (filters.is_completed !== undefined) {
    params.set('is_completed', String(filters.is_completed));
  }
  if (filters.goal_type !== undefined) {
    params.set('goal_type', filters.goal_type);
  }

  const queryString = params.toString();
  const url = `${API_CONFIG.baseURL}/financial/savings-goals${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to list savings goals');
  }

  const result: ApiResponse<SavingsGoal[]> = await response.json();
  return result.data || []; // Handle null/undefined from backend
}

/**
 * Get a single savings goal by ID
 */
export async function getSavingsGoal(
  goalId: number,
  options: RequestOptions
): Promise<SavingsGoal> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/savings-goals/${goalId}`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get savings goal');
  }

  const result: ApiResponse<SavingsGoal> = await response.json();
  return result.data;
}

/**
 * Get progress for a savings goal (includes current amount, monthly contributions, etc.)
 */
export async function getSavingsGoalProgress(
  goalId: number,
  options: RequestOptions
): Promise<SavingsGoalProgress> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/savings-goals/${goalId}/progress`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get savings goal progress');
  }

  const result: ApiResponse<SavingsGoalProgress> = await response.json();
  return result.data;
}

/**
 * Get detailed summary of a savings goal (includes progress and linked transactions)
 */
export async function getSavingsGoalSummary(
  goalId: number,
  options: RequestOptions
): Promise<SavingsGoalDetail> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/savings-goals/${goalId}/summary`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get savings goal summary');
  }

  const result: ApiResponse<SavingsGoalDetail> = await response.json();
  return result.data;
}

/**
 * Create a new savings goal
 */
export async function createSavingsGoal(
  data: CreateSavingsGoalRequest,
  options: RequestOptions
): Promise<SavingsGoal> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/savings-goals`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create savings goal');
  }

  const result: ApiResponse<SavingsGoal> = await response.json();
  return result.data;
}

/**
 * Update an existing savings goal
 */
export async function updateSavingsGoal(
  goalId: number,
  data: UpdateSavingsGoalRequest,
  options: RequestOptions
): Promise<SavingsGoal> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/savings-goals/${goalId}`,
    {
      method: 'PUT',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update savings goal');
  }

  const result: ApiResponse<SavingsGoal> = await response.json();
  return result.data;
}

/**
 * Delete a savings goal (soft delete - sets is_active to false)
 */
export async function deleteSavingsGoal(
  goalId: number,
  options: RequestOptions
): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/savings-goals/${goalId}`,
    {
      method: 'DELETE',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete savings goal');
  }
}

/**
 * Mark a savings goal as completed
 */
export async function completeSavingsGoal(
  goalId: number,
  options: RequestOptions
): Promise<SavingsGoal> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/savings-goals/${goalId}/complete`,
    {
      method: 'POST',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to complete savings goal');
  }

  const result: ApiResponse<SavingsGoal> = await response.json();
  return result.data;
}

/**
 * Reopen a previously completed savings goal
 */
export async function reopenSavingsGoal(
  goalId: number,
  options: RequestOptions
): Promise<SavingsGoal> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/savings-goals/${goalId}/reopen`,
    {
      method: 'POST',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to reopen savings goal');
  }

  const result: ApiResponse<SavingsGoal> = await response.json();
  return result.data;
}

/**
 * Add a manual contribution to a savings goal
 * Positive amount = add to goal, Negative amount = subtract from goal
 */
export async function addContribution(
  goalId: number,
  data: AddContributionRequest,
  options: RequestOptions
): Promise<SavingsGoalProgress> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/savings-goals/${goalId}/contribute`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to add contribution');
  }

  const result: ApiResponse<SavingsGoalProgress> = await response.json();
  return result.data;
}
