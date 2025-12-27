import type { CategoryBudget } from '../types/budget';
import CategoryBudgetCard from './CategoryBudgetCard';
import IncomePlanningAlert from './IncomePlanningAlert';

interface MonthlyBudgetCardProps {
  month: number;
  year: number;
  budgets: CategoryBudget[];
  categories: Array<{ category_id: number; name: string }>;
  actualSpending: Record<number, string>;
  isCurrent: boolean;
  isConsolidated: boolean;
  onEditBudget: (budget: CategoryBudget) => void;
  onDeleteBudget: (budgetId: number) => void;
  onConsolidate: (budgetId: number) => void;
}

export default function MonthlyBudgetCard({
  month,
  year,
  budgets,
  categories,
  actualSpending,
  isCurrent,
  isConsolidated,
  onEditBudget,
  onDeleteBudget,
  onConsolidate,
}: MonthlyBudgetCardProps) {
  const getMonthName = (monthNum: number) => {
    const date = new Date(2024, monthNum - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find((c) => c.category_id === categoryId);
    return category ? category.name : 'Unknown';
  };

  // Calculate totals (with safety checks)
  const budgetArray = Array.isArray(budgets) ? budgets : [];
  const totalPlanned = budgetArray.reduce((sum, b) => sum + parseFloat(b.PlannedAmount || '0'), 0);
  const totalSpent = budgetArray.reduce((sum, b) => sum + parseFloat(actualSpending[b.CategoryID] || '0'), 0);
  const totalVariance = totalPlanned - totalSpent;

  return (
    <div
      id={isCurrent ? 'current-month-budget' : undefined}
      className={`bg-white rounded-lg shadow-lg overflow-hidden ${
        isCurrent ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Header */}
      <div className={`p-6 ${isCurrent ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {getMonthName(month)} {year}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {budgetArray.length} {budgetArray.length === 1 ? 'categoria' : 'categorias'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isCurrent && (
              <span className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                📅 MÊS ATUAL
              </span>
            )}
            {isConsolidated && (
              <span className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                ✓ Consolidado
              </span>
            )}
            {!isConsolidated && !isCurrent && (
              <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
                Em progresso
              </span>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Planejado</p>
            <p className="text-lg font-bold text-gray-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPlanned)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Gasto</p>
            <p className="text-lg font-bold text-gray-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Variação</p>
            <p className={`text-lg font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVariance)}
            </p>
          </div>
        </div>
      </div>

      {/* Income Planning Alert (only for current month) */}
      {isCurrent && (
        <div className="px-6 pt-6">
          <IncomePlanningAlert month={month} year={year} />
        </div>
      )}

      {/* Category Budget Cards */}
      <div className="p-6">
        {budgetArray.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">📊</div>
            <p>Nenhum orçamento cadastrado para este mês</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgetArray.map((budget) => (
              <CategoryBudgetCard
                key={budget.CategoryBudgetID}
                budget={budget}
                categoryName={getCategoryName(budget.CategoryID)}
                actualSpent={actualSpending[budget.CategoryID] || '0.00'}
                onEdit={onEditBudget}
                onDelete={onDeleteBudget}
                onConsolidate={onConsolidate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
