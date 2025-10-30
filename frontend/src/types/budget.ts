export interface Budget {
  BudgetID: number;
  UserID: number;
  OrganizationID: number;
  Name: string;
  Month: number;
  Year: number;
  BudgetType: 'fixed' | 'calculated' | 'hybrid';
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
  budget_type: 'fixed' | 'calculated' | 'hybrid';
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
