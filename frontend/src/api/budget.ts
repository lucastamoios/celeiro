import type {
  BudgetItem,
  BudgetSpending,
  CreateBudgetItemRequest,
  UpdateBudgetItemRequest,
} from '../types/budget';
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
  return {
    'Authorization': `Bearer ${options.token}`,
    'X-Active-Organization': options.organizationId || '1',
    'Content-Type': 'application/json',
  };
}

/**
 * Create a new budget item for a specific budget
 */
export async function createBudgetItem(
  budgetId: number,
  data: CreateBudgetItemRequest,
  options: RequestOptions
): Promise<BudgetItem> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/${budgetId}/items`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create budget item: ${error}`);
  }

  const result: ApiResponse<BudgetItem> = await response.json();
  return result.data;
}

/**
 * Update an existing budget item
 */
export async function updateBudgetItem(
  budgetId: number,
  itemId: number,
  data: UpdateBudgetItemRequest,
  options: RequestOptions
): Promise<BudgetItem> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/${budgetId}/items/${itemId}`,
    {
      method: 'PATCH',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update budget item: ${error}`);
  }

  const result: ApiResponse<BudgetItem> = await response.json();
  return result.data;
}

/**
 * Delete a budget item
 */
export async function deleteBudgetItem(
  budgetId: number,
  itemId: number,
  options: RequestOptions
): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/${budgetId}/items/${itemId}`,
    {
      method: 'DELETE',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete budget item: ${error}`);
  }
}

/**
 * Get spending data for a budget (aggregated by category)
 */
export async function getBudgetSpending(
  budgetId: number,
  options: RequestOptions
): Promise<BudgetSpending> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/${budgetId}/spending`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch budget spending: ${error}`);
  }

  const result: ApiResponse<BudgetSpending> = await response.json();
  return result.data;
}
