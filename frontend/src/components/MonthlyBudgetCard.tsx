import { useState, useCallback } from 'react';
import { BarChart3, Copy, Check, AlertTriangle, Calendar } from 'lucide-react';
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
  hideHeader?: boolean;
  onEditBudget: (budget: CategoryBudget) => void;
  onDeleteBudget: (budgetId: number) => void;
  onDeleteMonth?: () => Promise<void>;
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
  hideHeader = false,
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
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      setShowDeleteConfirm(false);
    }
  }, [isDeleting]);

  const handleConfirmDelete = async () => {
    if (onDeleteMonth && !isDeleting) {
      setIsDeleting(true);
      try {
        await onDeleteMonth();
        setShowDeleteConfirm(false);
      } finally {
        setIsDeleting(false);
      }
    }
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

  // Group planned entries by category ID
  const entriesByCategoryId = plannedEntries.reduce((acc, entry) => {
    const categoryId = entry.CategoryID;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(entry);
    return acc;
  }, {} as Record<number, PlannedEntryWithStatus[]>);

  // Get set of category IDs that have budgets
  const budgetCategoryIds = new Set(budgetArray.map(b => b.CategoryID));

  // Find orphan entries (entries for categories without a budget)
  const orphanEntries = plannedEntries.filter(entry => !budgetCategoryIds.has(entry.CategoryID));

  return (
    <div
      id={isCurrent ? 'current-month-budget' : undefined}
      className={`bg-white rounded-xl shadow-warm-sm border border-stone-200 overflow-hidden ${
        !hideHeader && isCurrent ? 'ring-2 ring-wheat-500' : ''
      }`}
    >
      {/* Header - Clickable to expand (hidden when hideHeader is true) */}
      {!hideHeader && (
        <div
          className={`p-4 sm:p-6 cursor-pointer hover:brightness-95 transition-all ${isCurrent ? 'bg-gradient-to-r from-wheat-50 to-wheat-100' : 'bg-stone-50'}`}
          onClick={onToggleExpand}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              {/* Expand/Collapse Arrow */}
              <svg
                className={`w-5 h-5 text-stone-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div>
                <h2 className="text-2xl font-bold text-stone-900 capitalize">
                  {getMonthName(month, year)}
                </h2>
                <p className="text-sm text-stone-600 mt-1">
                  {budgetArray.length} {budgetArray.length === 1 ? 'categoria' : 'categorias'}
                  {plannedEntries.length > 0 && (
                    <span className="ml-2 text-wheat-600">
                      • {plannedEntries.length} {plannedEntries.length === 1 ? 'entrada planejada' : 'entradas planejadas'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {isCurrent && (
                <span className="px-2 sm:px-3 py-1 text-xs font-semibold text-wheat-700 bg-wheat-100 rounded-full inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  MÊS ATUAL
                </span>
              )}
              {isConsolidated && (
                <span className="px-2 sm:px-3 py-1 text-xs font-semibold text-sage-700 bg-sage-100 rounded-full inline-flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Consolidado
                </span>
              )}
              {!isConsolidated && !isCurrent && (
                <span className="px-2 sm:px-3 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-full">
                  Em progresso
                </span>
              )}
              {/* Planned entries status indicators */}
              {plannedEntries.some(e => e.Status === 'missed') && (
                <span className="px-2 py-1 text-xs font-semibold text-rust-700 bg-rust-100 rounded-full inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Atrasado
                </span>
              )}
              {/* Delete month button */}
              {onDeleteMonth && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="p-2 text-stone-400 hover:text-rust-500 hover:bg-rust-50 rounded-full transition-colors"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-warm-sm">
              <p className="text-xs text-stone-600 mb-1">Planejado</p>
              <p className="text-base sm:text-lg font-bold text-stone-900 tabular-nums">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPlanned)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-warm-sm">
              <p className="text-xs text-stone-600 mb-1">Gasto</p>
              <p className="text-base sm:text-lg font-bold text-stone-900 tabular-nums">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-warm-sm">
              <p className="text-xs text-stone-600 mb-1">Variação</p>
              <p className={`text-base sm:text-lg font-bold tabular-nums ${totalVariance >= 0 ? 'text-sage-600' : 'text-rust-600'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVariance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Income Planning Alert (only for current month) */}
      {isCurrent && (
        <div className="px-6 pt-6">
          <IncomePlanningAlert month={month} year={year} />
        </div>
      )}

      {/* Category Budget Cards */}
      <div className="p-4 sm:p-6">
        {budgetArray.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <div className="flex justify-center mb-3">
              <BarChart3 className="w-12 h-12 text-stone-300" />
            </div>
            <p className="mb-4">Nenhum orçamento cadastrado para este mês</p>
            {hasPreviousMonthBudgets && onCopyFromPreviousMonth && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyFromPreviousMonth();
                }}
                className="px-4 py-2 text-sm text-wheat-700 bg-wheat-50 border border-wheat-200 rounded-lg hover:bg-wheat-100 transition-colors"
              >
                <Copy className="w-4 h-4 inline mr-1" />
                Copiar orçamentos do mês anterior
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

              // Get entries for this budget's category
              const categoryEntries = entriesByCategoryId[budget.CategoryID] || [];

              return (
                <CategoryBudgetCard
                  key={budget.CategoryBudgetID}
                  budget={budget}
                  categoryName={getCategoryName(budget.CategoryID)}
                  actualSpent={actualSpending[budget.CategoryID] || '0.00'}
                  canConsolidate={monthHasEnded}
                  plannedEntries={categoryEntries}
                  month={month}
                  year={year}
                  onEdit={onEditBudget}
                  onDelete={onDeleteBudget}
                  onConsolidate={onConsolidate}
                  onMatchEntry={onMatchEntry}
                  onUnmatchEntry={onUnmatchEntry}
                  onDismissEntry={onDismissEntry}
                  onUndismissEntry={onUndismissEntry}
                  onEditEntry={onEditEntry}
                  onDeleteEntry={onDeleteEntry}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Orphan Entries Section - Only show entries without a budget category */}
      {(hideHeader || isExpanded) && orphanEntries.length > 0 && (
        <div className="border-t border-stone-200 p-4 sm:p-6 bg-terra-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className="text-base sm:text-lg font-semibold text-stone-900">
                Entradas sem Orçamento
              </h3>
              <span className="text-xs px-2 py-1 rounded bg-terra-100 text-terra-700">
                {orphanEntries.length} {orphanEntries.length === 1 ? 'entrada' : 'entradas'}
              </span>
            </div>
            <p className="text-xs text-terra-700">
              Crie um orçamento para estas categorias para organizá-las melhor
            </p>
          </div>

          {plannedEntriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-warm-sm p-4 animate-pulse">
                  <div className="h-5 bg-stone-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-stone-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-stone-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orphanEntries.map((entry) => {
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
          className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-2xl shadow-warm-xl p-6 w-96 max-w-[90vw]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rust-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-rust-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">Excluir orçamentos</h3>
            </div>
            <div className="text-sm text-stone-600 mb-6">
              <p>Tem certeza que deseja excluir os dados de <strong>{getMonthName(month, year)}</strong>?</p>
              {(budgetArray.length > 0 || plannedEntries.length > 0) && (
                <div className="mt-2">
                  <p>Serão removidos:</p>
                  <ul className="list-disc list-inside mt-1 text-stone-500">
                    {budgetArray.length > 0 && (
                      <li>{budgetArray.length} {budgetArray.length === 1 ? 'orçamento' : 'orçamentos'}</li>
                    )}
                    {plannedEntries.length > 0 && (
                      <li>{plannedEntries.length} {plannedEntries.length === 1 ? 'entrada planejada será dispensada' : 'entradas planejadas serão dispensadas'}</li>
                    )}
                  </ul>
                </div>
              )}
              <p className="text-rust-600 mt-2">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
