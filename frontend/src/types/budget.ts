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
  PatternID?: number; // Link to advanced pattern for auto-matching
  Description: string;
  Amount: string; // Decimal as string (display amount)
  AmountMin?: string; // Decimal as string - minimum expected amount
  AmountMax?: string; // Decimal as string - maximum expected amount (used for budget)
  ExpectedDayStart?: number; // Start of expected day range (1-31)
  ExpectedDayEnd?: number; // End of expected day range (1-31)
  ExpectedDay?: number; // Legacy field for backwards compatibility
  EntryType: 'expense' | 'income';
  IsRecurrent: boolean;
  ParentEntryID?: number;
  IsActive: boolean;
  IsSavedPattern: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

// Planned Entry Status (monthly status tracking)
export type PlannedEntryStatusType = 'pending' | 'matched' | 'missed' | 'dismissed';

export interface PlannedEntryStatus {
  StatusID: number;
  PlannedEntryID: number;
  Month: number;
  Year: number;
  Status: PlannedEntryStatusType;
  MatchedTransactionID?: number;
  MatchedAmount?: string; // Decimal as string
  MatchedAt?: string;
  DismissedAt?: string;
  DismissalReason?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// Planned Entry with current month status (for display)
export interface PlannedEntryWithStatus extends PlannedEntry {
  Status: PlannedEntryStatusType;
  StatusColor: 'green' | 'yellow' | 'red' | 'gray';
  MatchedAmount?: string;
  MatchedTransactionID?: number;
  MatchedAt?: string;
  LinkedPattern?: AdvancedPattern;
}

// Advanced Pattern type (referenced from PlannedEntryWithStatus)
export interface AdvancedPattern {
  PatternID: number;
  UserID: number;
  OrganizationID: number;
  DescriptionPattern?: string;
  DatePattern?: string;
  WeekdayPattern?: string;
  AmountMin?: string;
  AmountMax?: string;
  TargetDescription: string;
  TargetCategoryID: number;
  ApplyRetroactively: boolean;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreatePlannedEntryRequest {
  category_id: number;
  description: string;
  amount: number;
  amount_min?: number;
  amount_max?: number;
  expected_day_start?: number;
  expected_day_end?: number;
  entry_type: 'expense' | 'income';
  is_recurrent: boolean;
  parent_entry_id?: number;
  expected_day?: number;
  is_saved_pattern: boolean;
  pattern_id?: number;
  description_pattern?: string; // Pattern for auto-matching transaction descriptions
}

export interface UpdatePlannedEntryRequest {
  description?: string;
  amount?: number;
  amount_min?: number;
  amount_max?: number;
  expected_day_start?: number;
  expected_day_end?: number;
  expected_day?: number;
  entry_type?: 'expense' | 'income';
  is_active?: boolean;
  pattern_id?: number;
}

export interface GenerateMonthlyInstancesRequest {
  month: number;
  year: number;
}

// Planned Entry Status Management
export interface MatchPlannedEntryRequest {
  transaction_id: number;
  month: number;
  year: number;
}

export interface DismissPlannedEntryRequest {
  month: number;
  year: number;
  reason?: string;
}

// Status color utility - returns Harvest palette color names
export function getStatusColor(status: PlannedEntryStatusType): string {
  switch (status) {
    case 'matched':
      return 'sage';
    case 'pending':
      return 'terra';
    case 'missed':
      return 'rust';
    case 'dismissed':
      return 'stone';
    default:
      return 'stone';
  }
}

export function getStatusBadgeClasses(status: PlannedEntryStatusType): string {
  switch (status) {
    case 'matched':
      return 'bg-sage-100 text-sage-700 border-sage-200';
    case 'pending':
      return 'bg-terra-100 text-terra-700 border-terra-200';
    case 'missed':
      return 'bg-rust-100 text-rust-700 border-rust-200';
    case 'dismissed':
      return 'bg-stone-100 text-stone-500 border-stone-200';
    default:
      return 'bg-stone-100 text-stone-500 border-stone-200';
  }
}

export function getStatusLabel(status: PlannedEntryStatusType): string {
  switch (status) {
    case 'matched':
      return 'Recebido';
    case 'pending':
      return 'Pendente';
    case 'missed':
      return 'Atrasado';
    case 'dismissed':
      return 'Dispensado';
    default:
      return status;
  }
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
