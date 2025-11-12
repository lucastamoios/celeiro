export interface Budget {
  BudgetID: number;
  UserID: number;
  OrganizationID: number;
  Name: string;
  Month: number;
  Year: number;
  BudgetType: 'fixed' | 'calculated' | 'maior';
  Amount: string; // Decimal as string from backend
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface BudgetItem {
  BudgetItemID: number;
  BudgetID: number;
  CategoryID: number;
  PlannedAmount: string; // Decimal as string from backend
  CreatedAt: string;
  UpdatedAt: string;
}

export interface BudgetWithItems {
  Budget: Budget;
  Items: BudgetItem[];
}

export interface CreateBudgetRequest {
  name: string;
  month: number;
  year: number;
  budget_type: 'fixed' | 'calculated' | 'maior';
  amount: number;
}

// Budget Item CRUD Types
export interface CreateBudgetItemRequest {
  category_id: number;
  planned_amount: number;
}

export interface UpdateBudgetItemRequest {
  planned_amount?: number;
}

// Budget Spending Types
export interface CategorySpending {
  [categoryID: number]: string; // categoryID -> total spent (decimal as string)
}

export interface BudgetSpending {
  category_spending: CategorySpending;
}

// Budget Progress Types
export interface CategoryProgress {
  category_id: number;
  category_name: string;
  planned_amount: string; // Decimal as string
  expected_at_current_day?: string; // Decimal as string, only for fixed budgets
  actual_spent: string; // Decimal as string
  variance: string; // Decimal as string
  status: string; // "on_track", "over_budget", "warning"
}

export interface BudgetProgress {
  budget_id: number;
  budget_type: string;
  total_budget: string; // Decimal as string
  current_day: number;
  days_in_month: number;
  progress_percentage: number;
  expected_at_current_day: string; // Decimal as string
  actual_spent: string; // Decimal as string
  variance: string; // Decimal as string
  status: string; // "on_track", "over_budget", "warning"
  categories?: CategoryProgress[];
  projection_end_of_month: string; // Decimal as string
  projected_variance_at_end: string; // Decimal as string
}

// Category-Centric Budget Types
export interface CategoryBudget {
  CategoryBudgetID: number;
  UserID: number;
  OrganizationID: number;
  CategoryID: number;
  Month: number;
  Year: number;
  BudgetType: 'fixed' | 'calculated' | 'maior';
  PlannedAmount: string; // Decimal as string
  IsConsolidated: boolean;
  ConsolidatedAt?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreateCategoryBudgetRequest {
  category_id: number;
  month: number;
  year: number;
  budget_type: 'fixed' | 'calculated' | 'maior';
  planned_amount: number;
}

export interface UpdateCategoryBudgetRequest {
  budget_type?: 'fixed' | 'calculated' | 'maior';
  planned_amount?: number;
}

// Planned Entry Types
export interface PlannedEntry {
  PlannedEntryID: number;
  UserID: number;
  OrganizationID: number;
  CategoryID: number;
  Description: string;
  Amount: string; // Decimal as string
  IsRecurrent: boolean;
  ParentEntryID?: number;
  ExpectedDay?: number;
  IsActive: boolean;
  IsSavedPattern: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreatePlannedEntryRequest {
  category_id: number;
  description: string;
  amount: number;
  is_recurrent: boolean;
  parent_entry_id?: number;
  expected_day?: number;
  is_saved_pattern: boolean;
}

export interface UpdatePlannedEntryRequest {
  description?: string;
  amount?: number;
  expected_day?: number;
  is_active?: boolean;
}

export interface GenerateMonthlyInstancesRequest {
  month: number;
  year: number;
}

// Monthly Snapshot Types
export interface MonthlySnapshot {
  SnapshotID: number;
  UserID: number;
  OrganizationID: number;
  CategoryID: number;
  Month: number;
  Year: number;
  PlannedAmount: string; // Decimal as string
  ActualAmount: string; // Decimal as string
  VariancePercent: string; // Decimal as string
  BudgetType: string;
  CreatedAt: string;
}

// Variance warning thresholds
export const VARIANCE_THRESHOLDS = {
  MINOR: 1, // 1% - yellow warning
  MAJOR: 10, // 10% - red warning
} as const;

export type VarianceStatus = 'on_track' | 'warning' | 'critical' | 'over_budget';

export function getVarianceStatus(variancePercent: number): VarianceStatus {
  const absVariance = Math.abs(variancePercent);

  if (variancePercent > 0) {
    // Over budget
    if (absVariance >= VARIANCE_THRESHOLDS.MAJOR) return 'critical';
    if (absVariance >= VARIANCE_THRESHOLDS.MINOR) return 'warning';
  }

  return 'on_track';
}

// =============================================================================
// Pattern Matching Types
// =============================================================================

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface MatchScore {
  PatternID: number;
  Description: string;
  Amount: string; // Decimal as string
  CategoryID: number;
  CategoryScore: number; // 0-1
  AmountScore: number; // 0-1
  DescriptionScore: number; // 0-1
  DateScore: number; // 0-1
  TotalScore: number; // Weighted sum (0-1)
  Confidence: MatchConfidence;
}

export interface MatchSuggestion {
  Pattern: PlannedEntry;
  MatchScore: MatchScore;
}

export interface SaveTransactionAsPatternRequest {
  is_recurrent?: boolean;
  expected_day?: number;
}

export interface ApplyPatternToTransactionRequest {
  pattern_id: number;
}

// Match score thresholds
export const MATCH_THRESHOLDS = {
  HIGH: 0.8, // 80%+ = high confidence
  MEDIUM: 0.6, // 60-80% = medium confidence
  LOW: 0.4, // 40-60% = low confidence (below this = don't suggest)
} as const;

export function getMatchConfidenceColor(confidence: MatchConfidence): string {
  switch (confidence) {
    case 'HIGH':
      return 'text-green-600 bg-green-100';
    case 'MEDIUM':
      return 'text-yellow-600 bg-yellow-100';
    case 'LOW':
      return 'text-gray-600 bg-gray-100';
  }
}

export function formatMatchScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

// =============================================================================
// Income Planning Types
// =============================================================================

export interface IncomePlanningReport {
  month: number;
  year: number;
  totalIncome: string; // Decimal as string
  totalPlanned: string; // Decimal as string
  unallocated: string; // Decimal as string
  unallocatedPercent: number; // 0.5 = 0.5%
  threshold: number; // 0.25
  status: 'OK' | 'WARNING';
  message: string;
}
