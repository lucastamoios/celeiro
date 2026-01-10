import type {
  BudgetItem,
  BudgetSpending,
  BudgetProgress,
  CreateBudgetItemRequest,
  UpdateBudgetItemRequest,
  CategoryBudget,
  CreateCategoryBudgetRequest,
  UpdateCategoryBudgetRequest,
  PlannedEntry,
  PlannedEntryWithStatus,
  PlannedEntryStatus,
  CreatePlannedEntryRequest,
  UpdatePlannedEntryRequest,
  GenerateMonthlyInstancesRequest,
  MatchPlannedEntryRequest,
  DismissPlannedEntryRequest,
  MonthlySnapshot,
  IncomePlanningReport,
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
  if (!options.organizationId) {
    throw new Error('Organization ID is required - ensure activeOrganization is set');
  }
  return {
    'Authorization': `Bearer ${options.token}`,
    'X-Active-Organization': options.organizationId,
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create budget item');
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update budget item');
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete budget item');
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch budget spending');
  }

  const result: ApiResponse<BudgetSpending> = await response.json();
  return result.data;
}

/**
 * Get budget progress with tracking and forecasting data
 */
export async function getBudgetProgress(
  budgetId: number,
  options: RequestOptions
): Promise<BudgetProgress> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/${budgetId}/progress`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch budget progress');
  }

  const result: ApiResponse<BudgetProgress> = await response.json();
  return result.data;
}

// ============================================================================
// Category Budgets
// ============================================================================

/**
 * Get all category budgets with optional filters
 */
export async function getCategoryBudgets(
  filters: { month?: number; year?: number; category_id?: number },
  options: RequestOptions
): Promise<CategoryBudget[]> {
  const params = new URLSearchParams();
  if (filters.month) params.append('month', filters.month.toString());
  if (filters.year) params.append('year', filters.year.toString());
  if (filters.category_id) params.append('category_id', filters.category_id.toString());

  const url = `${API_CONFIG.baseURL}/financial/budgets/categories${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch category budgets');
  }

  const result: ApiResponse<CategoryBudget[]> = await response.json();
  return result.data;
}

/**
 * Get a single category budget by ID
 */
export async function getCategoryBudget(
  budgetId: number,
  options: RequestOptions
): Promise<CategoryBudget> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/categories/${budgetId}`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch category budget');
  }

  const result: ApiResponse<CategoryBudget> = await response.json();
  return result.data;
}

/**
 * Create a new category budget
 */
export async function createCategoryBudget(
  data: CreateCategoryBudgetRequest,
  options: RequestOptions
): Promise<CategoryBudget> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/categories`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create category budget');
  }

  const result: ApiResponse<CategoryBudget> = await response.json();
  return result.data;
}

/**
 * Update an existing category budget
 */
export async function updateCategoryBudget(
  budgetId: number,
  data: UpdateCategoryBudgetRequest,
  options: RequestOptions
): Promise<CategoryBudget> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/categories/${budgetId}`,
    {
      method: 'PUT',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update category budget');
  }

  const result: ApiResponse<CategoryBudget> = await response.json();
  return result.data;
}

/**
 * Delete a category budget
 */
export async function deleteCategoryBudget(
  budgetId: number,
  options: RequestOptions
): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/categories/${budgetId}`,
    {
      method: 'DELETE',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete category budget');
  }
}

/**
 * Consolidate a category budget (creates snapshot)
 */
export async function consolidateCategoryBudget(
  budgetId: number,
  options: RequestOptions
): Promise<MonthlySnapshot> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/categories/${budgetId}/consolidate`,
    {
      method: 'POST',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to consolidate category budget');
  }

  const result: ApiResponse<MonthlySnapshot> = await response.json();
  return result.data;
}

/**
 * Copy category budgets from one month to another
 */
export async function copyCategoryBudgetsFromMonth(
  data: {
    source_month: number;
    source_year: number;
    target_month: number;
    target_year: number;
  },
  options: RequestOptions
): Promise<CategoryBudget[]> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/budgets/categories/copy`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to copy category budgets');
  }

  const result: ApiResponse<CategoryBudget[]> = await response.json();
  // Ensure we always return an array (backend may return null/undefined for empty results)
  return result.data ?? [];
}

// ============================================================================
// Planned Entries
// ============================================================================

/**
 * Get all planned entries with optional filters
 */
export async function getPlannedEntries(
  filters: {
    category_id?: number;
    is_recurrent?: boolean;
    is_saved_pattern?: boolean;
    is_active?: boolean;
  },
  options: RequestOptions
): Promise<PlannedEntry[]> {
  const params = new URLSearchParams();
  if (filters.category_id !== undefined) params.append('category_id', filters.category_id.toString());
  if (filters.is_recurrent !== undefined) params.append('is_recurrent', filters.is_recurrent.toString());
  if (filters.is_saved_pattern !== undefined) params.append('is_saved_pattern', filters.is_saved_pattern.toString());
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());

  const url = `${API_CONFIG.baseURL}/financial/planned-entries${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch planned entries');
  }

  const result: ApiResponse<PlannedEntry[]> = await response.json();
  return result.data;
}

/**
 * Get saved transaction patterns
 */
export async function getSavedPatterns(
  categoryId: number | undefined,
  options: RequestOptions
): Promise<PlannedEntry[]> {
  const params = new URLSearchParams();
  if (categoryId !== undefined) params.append('category_id', categoryId.toString());

  const url = `${API_CONFIG.baseURL}/financial/planned-entries/patterns${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch saved patterns');
  }

  const result: ApiResponse<PlannedEntry[]> = await response.json();
  return result.data;
}

/**
 * Create a new planned entry
 */
export async function createPlannedEntry(
  data: CreatePlannedEntryRequest,
  options: RequestOptions
): Promise<PlannedEntry> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/planned-entries`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create planned entry');
  }

  const result: ApiResponse<PlannedEntry> = await response.json();
  return result.data;
}

/**
 * Update an existing planned entry
 */
export async function updatePlannedEntry(
  entryId: number,
  data: UpdatePlannedEntryRequest,
  options: RequestOptions
): Promise<PlannedEntry> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/planned-entries/${entryId}`,
    {
      method: 'PUT',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update planned entry');
  }

  const result: ApiResponse<PlannedEntry> = await response.json();
  return result.data;
}

/**
 * Delete a planned entry
 */
export async function deletePlannedEntry(
  entryId: number,
  options: RequestOptions
): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/planned-entries/${entryId}`,
    {
      method: 'DELETE',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete planned entry');
  }
}

/**
 * Generate monthly instances from a recurrent entry
 */
export async function generateMonthlyInstances(
  entryId: number,
  data: GenerateMonthlyInstancesRequest,
  options: RequestOptions
): Promise<PlannedEntry[]> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/planned-entries/${entryId}/generate`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate monthly instances');
  }

  const result: ApiResponse<PlannedEntry[]> = await response.json();
  return result.data;
}

// ============================================================================
// Planned Entry Status (Entrada Planejada)
// ============================================================================

/**
 * Get planned entries with status for a specific month/year
 */
export async function getPlannedEntriesForMonth(
  month: number,
  year: number,
  options: RequestOptions
): Promise<PlannedEntryWithStatus[]> {
  const params = new URLSearchParams();
  params.append('month', month.toString());
  params.append('year', year.toString());

  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/planned-entries/month?${params.toString()}`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch planned entries for month');
  }

  const result: ApiResponse<PlannedEntryWithStatus[]> = await response.json();
  return result.data;
}

/**
 * Match a transaction to a planned entry for a specific month
 */
export async function matchPlannedEntry(
  entryId: number,
  data: MatchPlannedEntryRequest,
  options: RequestOptions
): Promise<PlannedEntryStatus> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/planned-entries/${entryId}/match`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to match planned entry');
  }

  const result: ApiResponse<PlannedEntryStatus> = await response.json();
  return result.data;
}

/**
 * Remove the match between a planned entry and a transaction
 */
export async function unmatchPlannedEntry(
  entryId: number,
  month: number,
  year: number,
  options: RequestOptions
): Promise<void> {
  const params = new URLSearchParams();
  params.append('month', month.toString());
  params.append('year', year.toString());

  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/planned-entries/${entryId}/match?${params.toString()}`,
    {
      method: 'DELETE',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to unmatch planned entry');
  }
}

/**
 * Dismiss a planned entry for a specific month
 */
export async function dismissPlannedEntry(
  entryId: number,
  data: DismissPlannedEntryRequest,
  options: RequestOptions
): Promise<PlannedEntryStatus> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/planned-entries/${entryId}/dismiss`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to dismiss planned entry');
  }

  const result: ApiResponse<PlannedEntryStatus> = await response.json();
  return result.data;
}

/**
 * Undismiss a planned entry for a specific month
 */
export async function undismissPlannedEntry(
  entryId: number,
  month: number,
  year: number,
  options: RequestOptions
): Promise<PlannedEntryStatus> {
  const params = new URLSearchParams();
  params.append('month', month.toString());
  params.append('year', year.toString());

  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/planned-entries/${entryId}/dismiss?${params.toString()}`,
    {
      method: 'DELETE',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to undismiss planned entry');
  }

  const result: ApiResponse<PlannedEntryStatus> = await response.json();
  return result.data;
}

// ============================================================================
// Monthly Snapshots
// ============================================================================

/**
 * Get monthly snapshots with optional filters
 */
export async function getMonthlySnapshots(
  filters: { category_id?: number; month?: number; year?: number },
  options: RequestOptions
): Promise<MonthlySnapshot[]> {
  const params = new URLSearchParams();
  if (filters.category_id) params.append('category_id', filters.category_id.toString());
  if (filters.month) params.append('month', filters.month.toString());
  if (filters.year) params.append('year', filters.year.toString());

  const url = `${API_CONFIG.baseURL}/financial/snapshots${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch monthly snapshots');
  }

  const result: ApiResponse<MonthlySnapshot[]> = await response.json();
  return result.data;
}

/**
 * Get a single monthly snapshot by ID
 */
export async function getMonthlySnapshot(
  snapshotId: number,
  options: RequestOptions
): Promise<MonthlySnapshot> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/snapshots/${snapshotId}`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch monthly snapshot');
  }

  const result: ApiResponse<MonthlySnapshot> = await response.json();
  return result.data;
}

// ============================================================================
// Transaction Planned Entry
// ============================================================================

/**
 * Get the planned entry linked to a transaction (if any)
 */
export async function getPlannedEntryForTransaction(
  transactionId: number,
  options: RequestOptions
): Promise<PlannedEntryWithStatus | null> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/transactions/${transactionId}/planned-entry`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get planned entry for transaction');
  }

  const result: ApiResponse<PlannedEntryWithStatus | Record<string, never>> = await response.json();

  // Backend returns empty object {} when no linked entry
  if (!result.data || Object.keys(result.data).length === 0) {
    return null;
  }

  return result.data as PlannedEntryWithStatus;
}

// ============================================================================
// Income Planning
// ============================================================================

/**
 * Get income planning report for a specific month
 */
export async function getIncomePlanning(
  month: number,
  year: number,
  options: RequestOptions
): Promise<IncomePlanningReport> {
  const params = new URLSearchParams();
  params.append('month', month.toString());
  params.append('year', year.toString());

  const url = `${API_CONFIG.baseURL}/financial/income-planning?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch income planning');
  }

  const result: ApiResponse<IncomePlanningReport> = await response.json();
  return result.data;
}
