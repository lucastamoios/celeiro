export interface Account {
  account_id?: number
  AccountID?: number
  name?: string
  Name?: string
  bank_name?: string
  BankName?: string
  is_active?: boolean
  IsActive?: boolean
}

export interface Transaction {
  transaction_id: number
  account_id: number
  category_id?: number | null
  description: string
  original_description?: string | null
  amount: string
  transaction_date: string
  transaction_type: string
  is_ignored: boolean
  tags?: string[]
}

export interface UpdateTransactionRequest {
  description?: string
}

export interface Category {
  category_id: number
  name: string
  icon: string
  color: string
  category_type: "expense" | "income"
  is_system: boolean
  is_controllable: boolean
  user_id: number | null
  created_at: string
  updated_at: string
}

export interface CategoryPacing {
  category_id: number
  category_name: string
  category_icon: string
  budget: string
  spent: string
  expected: string
  variance: string
  status: "under_pace" | "on_pace" | "over_pace" | "no_budget"
}

export interface ControllableCategoryPacing {
  month: number
  year: number
  current_day: number
  days_in_month: number
  progress_percentage: number
  categories: CategoryPacing[]
}

export type PlannedEntryStatusType = "scheduled" | "pending" | "matched" | "missed" | "dismissed"

export interface PlannedEntryWithStatus {
  PlannedEntryID: number
  CategoryID: number
  Description: string
  Amount: string
  AmountMin?: string | null
  AmountMax?: string | null
  ExpectedDayStart?: number | null
  ExpectedDayEnd?: number | null
  ExpectedDay?: number | null
  EntryType: "expense" | "income"
  IsActive: boolean
  Status: PlannedEntryStatusType
  StatusColor: "green" | "yellow" | "red" | "gray"
  MatchedAmount?: string | null
  MatchedTransactionID?: number | null
  MatchedAt?: string | null
}

export interface TagPlannedEntry {
  planned_entry_id: number
  description: string
  amount: string
  status: string
  paid: boolean
}

export interface TagSpending {
  tag_id: number
  name: string
  icon: string
  color: string
  total: string
  planned: string
  transaction_count: number
  planned_entries?: TagPlannedEntry[]
}

export interface SavingsGoal {
  savings_goal_id: number
  name: string
  goal_type: string
  target_amount: string
  initial_amount: string
  due_date?: string | null
  start_date?: string | null
  icon?: string | null
  color?: string | null
  is_active: boolean
  is_completed: boolean
  monthly_contribution?: string | null
}

export interface MonthlyContribution {
  month: number
  year: number
  amount: string
}

export interface SavingsGoalProgress {
  goal: SavingsGoal
  current_amount: string
  progress_percent: string
  months_remaining?: number | null
  monthly_target?: string | null
  is_on_track?: boolean | null
  monthly_contributions?: MonthlyContribution[]
}
