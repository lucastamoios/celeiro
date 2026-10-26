export function isMonthClosed(budgets: Array<{ IsConsolidated: boolean }>): boolean {
  return budgets.length > 0 && budgets.every((budget) => budget.IsConsolidated);
}
