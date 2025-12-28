import type { CategoryBudget, PlannedEntryWithStatus } from '../types/budget';
import CategoryBudgetCard from './CategoryBudgetCard';
import IncomePlanningAlert from './IncomePlanningAlert';
import PlannedEntryCard from './PlannedEntryCard';

interface MonthlyBudgetCardProps {
  month: number;
  year: number;
  budgets: CategoryBudget[];
  categories: Array<{ category_id: number; name: string }>;
  actualSpending: Record<number, string>;
  isCurrent: boolean;
  isConsolidated: boolean;
  isExpanded: boolean;
  plannedEntries: PlannedEntryWithStatus[];
  plannedEntriesLoading: boolean;
  onEditBudget: (budget: CategoryBudget) => void;
  onDeleteBudget: (budgetId: number) => void;
  onConsolidate: (budgetId: number) => void;
  onToggleExpand: () => void;
  onMatchEntry?: (entryId: number) => void;
  onUnmatchEntry?: (entryId: number) => void;
  onDismissEntry?: (entryId: number, reason?: string) => void;
  onUndismissEntry?: (entryId: number) => void;
  onEditEntry?: (entry: PlannedEntryWithStatus) => void;
  onDeleteEntry?: (entryId: number) => void;
}

export default function MonthlyBudgetCard({
  month,
  year,
  budgets,
  categories,
  actualSpending,
  isCurrent,
  isConsolidated,
  isExpanded,
  plannedEntries,
  plannedEntriesLoading,
  onEditBudget,
  onDeleteBudget,
  onConsolidate,
  onToggleExpand,
  onMatchEntry,
  onUnmatchEntry,
  onDismissEntry,
  onUndismissEntry,
  onEditEntry,
  onDeleteEntry,
}: MonthlyBudgetCardProps) {
  const getMonthName = (monthNum: number, yearNum: number) => {
    const date = new Date(yearNum, monthNum - 1, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    // Capitalize first letter and append year without "de"
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${yearNum}`;
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
      {/* Header - Clickable to expand */}
      <div
        className={`p-6 cursor-pointer hover:brightness-95 transition-all ${isCurrent ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : 'bg-gray-50'}`}
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Expand/Collapse Arrow */}
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {getMonthName(month, year)}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {budgetArray.length} {budgetArray.length === 1 ? 'categoria' : 'categorias'}
                {plannedEntries.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    • {plannedEntries.length} {plannedEntries.length === 1 ? 'entrada planejada' : 'entradas planejadas'}
                  </span>
                )}
              </p>
            </div>
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
            {/* Planned entries status indicators */}
            {plannedEntries.some(e => e.Status === 'missed') && (
              <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                ⚠️ Atrasado
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

      {/* Planned Entries Section - Only when expanded */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Entradas Planejadas
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-600">Recebido</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-gray-600">Pendente</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span className="text-gray-600">Atrasado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span className="text-gray-600">Dispensado</span>
              </div>
            </div>
          </div>

          {plannedEntriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : plannedEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm">Nenhuma entrada planejada para este mês</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plannedEntries.map((entry) => {
                const category = categories.find(c => c.category_id === entry.CategoryID);
                return (
                  <PlannedEntryCard
                    key={entry.PlannedEntryID}
                    entry={entry}
                    categoryName={category?.name || 'Categoria desconhecida'}
                    month={month}
                    year={year}
                    onMatch={onMatchEntry}
                    onUnmatch={onUnmatchEntry}
                    onDismiss={onDismissEntry}
                    onUndismiss={onUndismissEntry}
                    onEdit={onEditEntry}
                    onDelete={onDeleteEntry}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
