import { useState, useCallback } from 'react';
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
  hasPreviousMonthBudgets?: boolean;
  onEditBudget: (budget: CategoryBudget) => void;
  onDeleteBudget: (budgetId: number) => void;
  onDeleteMonth?: () => void;
  onConsolidate: (budgetId: number) => void;
  onToggleExpand: () => void;
  onCopyFromPreviousMonth?: () => void;
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
  hasPreviousMonthBudgets,
  onEditBudget,
  onDeleteBudget,
  onDeleteMonth,
  onConsolidate,
  onToggleExpand,
  onCopyFromPreviousMonth,
  onMatchEntry,
  onUnmatchEntry,
  onDismissEntry,
  onUndismissEntry,
  onEditEntry,
  onDeleteEntry,
}: MonthlyBudgetCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowDeleteConfirm(false);
    }
  }, []);

  const handleConfirmDelete = () => {
    if (onDeleteMonth) {
      onDeleteMonth();
    }
    setShowDeleteConfirm(false);
  };
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

  // Calculate totals (with safety checks for NaN)
  const budgetArray = Array.isArray(budgets) ? budgets : [];
  const totalPlanned = budgetArray.reduce((sum, b) => {
    const val = parseFloat(b.PlannedAmount || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const totalSpent = budgetArray.reduce((sum, b) => {
    const val = parseFloat(actualSpending[b.CategoryID] || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
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
            {/* Delete month button */}
            {onDeleteMonth && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Excluir este mês"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
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
            <p className="mb-4">Nenhum orçamento cadastrado para este mês</p>
            {hasPreviousMonthBudgets && onCopyFromPreviousMonth && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyFromPreviousMonth();
                }}
                className="px-4 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                📋 Copiar orçamentos do mês anterior
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgetArray.map((budget) => {
              // Only allow consolidation after the month has ended
              const now = new Date();
              const currentMonth = now.getMonth() + 1;
              const currentYear = now.getFullYear();
              const monthHasEnded = year < currentYear || (year === currentYear && month < currentMonth);

              return (
                <CategoryBudgetCard
                  key={budget.CategoryBudgetID}
                  budget={budget}
                  categoryName={getCategoryName(budget.CategoryID)}
                  actualSpent={actualSpending[budget.CategoryID] || '0.00'}
                  canConsolidate={monthHasEnded}
                  onEdit={onEditBudget}
                  onDelete={onDeleteBudget}
                  onConsolidate={onConsolidate}
                />
              );
            })}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Excluir orçamentos</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja excluir os dados de <strong>{getMonthName(month, year)}</strong>?
              {(budgetArray.length > 0 || plannedEntries.length > 0) && (
                <span className="block mt-2">
                  Serão removidos:
                  <ul className="list-disc list-inside mt-1 text-gray-500">
                    {budgetArray.length > 0 && (
                      <li>{budgetArray.length} {budgetArray.length === 1 ? 'orçamento' : 'orçamentos'}</li>
                    )}
                    {plannedEntries.length > 0 && (
                      <li>{plannedEntries.length} {plannedEntries.length === 1 ? 'entrada planejada será dispensada' : 'entradas planejadas serão dispensadas'}</li>
                    )}
                  </ul>
                </span>
              )}
              <span className="text-red-600 mt-2 block">Esta ação não pode ser desfeita.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
