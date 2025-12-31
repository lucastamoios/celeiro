// =============================================================================
// Savings Goals Types
// =============================================================================

export type SavingsGoalType = 'reserva' | 'investimento';

export interface SavingsGoal {
  savings_goal_id: number;
  user_id: number;
  organization_id: number;
  name: string;
  goal_type: SavingsGoalType;
  target_amount: string; // Decimal as string from backend
  initial_amount: string; // Pre-existing balance (decimal as string)
  due_date?: string; // ISO 8601 date format (YYYY-MM-DD)
  icon?: string;
  color?: string;
  is_active: boolean;
  is_completed: boolean;
  completed_at?: string; // ISO 8601 datetime
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Monthly contribution to a savings goal
export interface MonthlyContribution {
  month: number;
  year: number;
  amount: string; // Decimal as string
}

// Progress tracking for a savings goal
export interface SavingsGoalProgress {
  goal: SavingsGoal;
  current_amount: string; // Decimal as string
  progress_percent: string; // Decimal as string (e.g., "45.5" = 45.5%)

  // Reserva-specific fields (only for goal_type = "reserva")
  months_remaining?: number;
  monthly_target?: string; // Decimal as string - amount needed per month to reach goal
  is_on_track?: boolean;

  // Monthly breakdown of contributions
  monthly_contributions?: MonthlyContribution[];
}

// Summary for lists and dropdowns
export interface SavingsGoalSummary {
  savings_goal_id: number;
  name: string;
  goal_type: SavingsGoalType;
  target_amount: string; // Decimal as string
  current_amount: string; // Decimal as string
  icon?: string;
  color?: string;
  is_completed: boolean;
}

// Detailed goal info with transactions (from /summary endpoint)
export interface SavingsGoalDetail {
  progress: SavingsGoalProgress;
  transactions: Transaction[];
}

// Import Transaction type (minimal version for this context)
export interface Transaction {
  transaction_id: number;
  account_id: number;
  description: string;
  amount: string;
  transaction_date: string;
  transaction_type: 'credit' | 'debit';
  category_id?: number;
}

// =============================================================================
// Request Types
// =============================================================================

export interface CreateSavingsGoalRequest {
  name: string;
  goal_type: SavingsGoalType;
  target_amount: number;
  initial_amount?: number; // Pre-existing balance when creating
  due_date?: string; // Format: "2006-01-02"
  icon?: string;
  color?: string;
  notes?: string;
}

export interface UpdateSavingsGoalRequest {
  name?: string;
  target_amount?: number;
  due_date?: string; // Format: "2006-01-02", empty string clears
  icon?: string;
  color?: string;
  notes?: string;
}

export interface AddContributionRequest {
  amount: number; // Positive = add, Negative = subtract
}

// =============================================================================
// List Filter Types
// =============================================================================

export interface ListSavingsGoalsFilters {
  is_active?: boolean;
  is_completed?: boolean;
  goal_type?: SavingsGoalType;
}

// =============================================================================
// UI Helpers
// =============================================================================

export function getGoalTypeLabel(goalType: SavingsGoalType): string {
  switch (goalType) {
    case 'reserva':
      return 'Reserva';
    case 'investimento':
      return 'Investimento';
    default:
      return goalType;
  }
}

export function getGoalTypeDescription(goalType: SavingsGoalType): string {
  switch (goalType) {
    case 'reserva':
      return 'Dinheiro separado para gastos futuros planejados (ex: IPTU, viagem)';
    case 'investimento':
      return 'Poupança de longo prazo sem data específica (ex: aposentadoria)';
    default:
      return '';
  }
}

export function getProgressColor(progressPercent: number): string {
  // Harvest palette: sage (success) → wheat (primary) → terra (warning) → rust (danger)
  if (progressPercent >= 100) return 'bg-sage-500';
  if (progressPercent >= 75) return 'bg-sage-400';
  if (progressPercent >= 50) return 'bg-wheat-400';
  if (progressPercent >= 25) return 'bg-terra-400';
  return 'bg-rust-400';
}

export function getProgressBadgeClasses(isOnTrack: boolean | undefined): string {
  // Harvest palette: stone (neutral), sage (on track), terra (behind)
  if (isOnTrack === undefined) return 'bg-stone-100 text-stone-600 border-stone-200';
  if (isOnTrack) return 'bg-sage-100 text-sage-800 border-sage-200';
  return 'bg-terra-100 text-terra-800 border-terra-200';
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatProgress(percent: string | number): string {
  const num = typeof percent === 'string' ? parseFloat(percent) : percent;
  return `${num.toFixed(1)}%`;
}

// Default goal colors for the color picker (Harvest palette aligned)
export const GOAL_COLORS = [
  '#d4a574', // Wheat-400
  '#b8956a', // Wheat-500
  '#6b9080', // Sage-500
  '#8fbc8f', // Sage-400
  '#c4956a', // Terra-400
  '#b87333', // Terra-500
  '#c77b58', // Rust-400
  '#78716c', // Stone-500
] as const;

// Default goal icons
export const GOAL_ICONS = [
  '🎯', // Target
  '💰', // Money bag
  '🏠', // House
  '🚗', // Car
  '✈️', // Airplane
  '🎓', // Graduation
  '💍', // Ring
  '📱', // Phone
  '🏖️', // Beach
  '🩺', // Medical
  '🔧', // Tools
  '📚', // Books
] as const;
