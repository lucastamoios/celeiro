import { useState, useEffect, useCallback } from 'react';
import type { CategoryBudget, PlannedEntryWithStatus, PlannedEntryStatusType } from '../types/budget';
import { getVarianceStatus, VARIANCE_THRESHOLDS, getStatusBadgeClasses, getStatusLabel } from '../types/budget';

interface CategoryBudgetCardProps {
  budget: CategoryBudget;
  categoryName: string;
  actualSpent: string; // Current spending for this category
  canConsolidate?: boolean; // Only allow consolidation after month ends
  plannedEntries?: PlannedEntryWithStatus[];
  month?: number;
  year?: number;
  onEdit?: (budget: CategoryBudget) => void;
  onDelete?: (budgetId: number) => void;
  onConsolidate?: (budgetId: number) => void;
  onMatchEntry?: (entryId: number) => void;
  onUnmatchEntry?: (entryId: number) => void;
  onDismissEntry?: (entryId: number, reason?: string) => void;
  onUndismissEntry?: (entryId: number) => void;
  onEditEntry?: (entry: PlannedEntryWithStatus) => void;
  onDeleteEntry?: (entryId: number) => void;
}

export default function CategoryBudgetCard({
  budget,
  categoryName,
  actualSpent,
  canConsolidate = false,
  plannedEntries = [],
  month,
  year,
  onEdit,
  onDelete,
  onConsolidate,
  onMatchEntry,
  onUnmatchEntry,
  onDismissEntry,
  onUndismissEntry,
  onEditEntry,
  onDeleteEntry,
}: CategoryBudgetCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissingEntryId, setDismissingEntryId] = useState<number | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [expandedEntryActions, setExpandedEntryActions] = useState<number | null>(null);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDismissModal(false);
        setDismissReason('');
        setDismissingEntryId(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowDismissModal(false);
      setDismissReason('');
      setDismissingEntryId(null);
    }
  }, []);

  const handleDismiss = () => {
    if (onDismissEntry && dismissingEntryId) {
      onDismissEntry(dismissingEntryId, dismissReason || undefined);
      setShowDismissModal(false);
      setDismissReason('');
      setDismissingEntryId(null);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(isNaN(num) ? 0 : num);
  };

  // Calculate variance (with safety checks for NaN)
  const plannedNum = parseFloat(budget.PlannedAmount || '0') || 0;
  const actualNum = parseFloat(actualSpent || '0') || 0;
  const variance = actualNum - plannedNum;
  const variancePercent = plannedNum > 0 ? (variance / plannedNum) * 100 : 0;
  const varianceStatus = getVarianceStatus(variancePercent);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'on_track':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical':
        return 'Critical';
      case 'warning':
        return 'Warning';
      case 'on_track':
        return 'On Track';
      default:
        return status;
    }
  };

  const getVarianceColor = () => {
    if (variancePercent > VARIANCE_THRESHOLDS.MAJOR) return 'text-red-600 font-semibold';
    if (variancePercent > VARIANCE_THRESHOLDS.MINOR) return 'text-yellow-600';
    if (variancePercent < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getBudgetTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'Fixed';
      case 'calculated':
        return 'Calculated';
      case 'maior':
        return 'Maior';
      default:
        return type;
    }
  };

  const getStatusIcon = (status: PlannedEntryStatusType) => {
    switch (status) {
      case 'matched':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'missed':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'dismissed':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getEntryAmountRange = (entry: PlannedEntryWithStatus) => {
    if (entry.AmountMin && entry.AmountMax) {
      const min = formatCurrency(entry.AmountMin);
      const max = formatCurrency(entry.AmountMax);
      if (entry.AmountMin === entry.AmountMax) {
        return max;
      }
      return `${min} - ${max}`;
    }
    return formatCurrency(entry.Amount);
  };

  const getExpectedDayRange = (entry: PlannedEntryWithStatus) => {
    if (entry.ExpectedDayStart && entry.ExpectedDayEnd) {
      if (entry.ExpectedDayStart === entry.ExpectedDayEnd) {
        return `Dia ${entry.ExpectedDayStart}`;
      }
      return `${entry.ExpectedDayStart}-${entry.ExpectedDayEnd}`;
    }
    if (entry.ExpectedDay) {
      return `Dia ${entry.ExpectedDay}`;
    }
    return null;
  };

  // Count entries by status
  const entryStats = {
    total: plannedEntries.length,
    matched: plannedEntries.filter(e => e.Status === 'matched').length,
    pending: plannedEntries.filter(e => e.Status === 'pending').length,
    missed: plannedEntries.filter(e => e.Status === 'missed').length,
    dismissed: plannedEntries.filter(e => e.Status === 'dismissed').length,
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-shadow ${
      entryStats.missed > 0 ? 'border-red-200' : 'border-gray-200'
    } hover:shadow-md`}>
      {/* Main Card Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{categoryName}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                {getBudgetTypeLabel(budget.BudgetType)}
              </span>
              {budget.IsConsolidated && (
                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                  Consolidated
                </span>
              )}
              {/* Entry status indicators */}
              {entryStats.total > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                  {entryStats.total} {entryStats.total === 1 ? 'entrada' : 'entradas'}
                </span>
              )}
              {entryStats.missed > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                  ⚠️ {entryStats.missed} atrasada{entryStats.missed > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

        {/* Actions Menu */}
        {!budget.IsConsolidated && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(budget);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    Edit Budget
                  </button>
                )}
                {onConsolidate && canConsolidate && (
                  <button
                    onClick={() => {
                      onConsolidate(budget.CategoryBudgetID);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    Consolidar
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir o orçamento de "${categoryName}"?`)) {
                        onDelete(budget.CategoryBudgetID);
                      }
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600"
                  >
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Budget Details */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-sm text-gray-600">Planned</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(budget.PlannedAmount)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Actual</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(actualSpent)}
          </div>
        </div>
      </div>

      {/* Variance */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Variance</div>
            <div className={`text-lg font-medium ${getVarianceColor()}`}>
              {variance >= 0 ? '+' : ''}
              {formatCurrency(variance.toFixed(2))}
              <span className="text-sm ml-1">
                ({variancePercent >= 0 ? '+' : ''}
                {variancePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(varianceStatus)}`}>
              {getStatusText(varianceStatus)}
            </span>
          </div>
        </div>

        {/* Variance Warning */}
        {varianceStatus === 'warning' && (
          <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
            <strong>⚠️ Minor variance:</strong> Spending is {variancePercent.toFixed(1)}% over budget
          </div>
        )}
        {varianceStatus === 'critical' && (
          <div className="mt-2 text-xs text-red-700 bg-red-50 px-3 py-2 rounded border border-red-200">
            <strong>🚨 Critical variance:</strong> Spending is {variancePercent.toFixed(1)}% over budget
          </div>
        )}
      </div>

      {/* Consolidated Info */}
      {budget.IsConsolidated && budget.ConsolidatedAt && (
        <div className="mt-3 text-xs text-gray-500 border-t border-gray-200 pt-3">
          Consolidated on {new Date(budget.ConsolidatedAt).toLocaleDateString('pt-BR')}
        </div>
      )}
      </div>

      {/* Expand/Collapse Button for Entries */}
      {entryStats.total > 0 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 flex items-center justify-center gap-2 text-sm text-gray-600 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {isExpanded ? 'Ocultar' : 'Ver'} {entryStats.total} {entryStats.total === 1 ? 'entrada planejada' : 'entradas planejadas'}
          {/* Mini status dots */}
          <div className="flex items-center gap-1 ml-2">
            {entryStats.matched > 0 && <span className="w-2 h-2 rounded-full bg-green-500" title={`${entryStats.matched} recebidas`} />}
            {entryStats.pending > 0 && <span className="w-2 h-2 rounded-full bg-yellow-500" title={`${entryStats.pending} pendentes`} />}
            {entryStats.missed > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title={`${entryStats.missed} atrasadas`} />}
            {entryStats.dismissed > 0 && <span className="w-2 h-2 rounded-full bg-gray-400" title={`${entryStats.dismissed} dispensadas`} />}
          </div>
        </button>
      )}

      {/* Expanded Entries Section */}
      {isExpanded && entryStats.total > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2">
          {plannedEntries.map((entry) => (
            <div
              key={entry.PlannedEntryID}
              className={`bg-white rounded-lg border-l-4 p-3 shadow-sm ${
                entry.Status === 'matched' ? 'border-green-500' :
                entry.Status === 'pending' ? 'border-yellow-500' :
                entry.Status === 'missed' ? 'border-red-500' :
                'border-gray-400'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">{entry.Description}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${getStatusBadgeClasses(entry.Status)}`}>
                      {getStatusIcon(entry.Status)}
                      {getStatusLabel(entry.Status)}
                    </span>
                    {entry.IsRecurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">🔄</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                    <span>{getEntryAmountRange(entry)}</span>
                    {getExpectedDayRange(entry) && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{getExpectedDayRange(entry)}</span>
                      </>
                    )}
                    {entry.Status === 'matched' && entry.MatchedAmount && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-green-600 font-medium">Recebido: {formatCurrency(entry.MatchedAmount)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Entry Actions */}
                <div className="relative ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedEntryActions(expandedEntryActions === entry.PlannedEntryID ? null : entry.PlannedEntryID);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>

                  {expandedEntryActions === entry.PlannedEntryID && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      {(entry.Status === 'pending' || entry.Status === 'missed') && onMatchEntry && (
                        <button
                          onClick={() => {
                            onMatchEntry(entry.PlannedEntryID);
                            setExpandedEntryActions(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-gray-700"
                        >
                          Vincular
                        </button>
                      )}
                      {entry.Status === 'matched' && onUnmatchEntry && (
                        <button
                          onClick={() => {
                            onUnmatchEntry(entry.PlannedEntryID);
                            setExpandedEntryActions(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-gray-700"
                        >
                          Desvincular
                        </button>
                      )}
                      {(entry.Status === 'pending' || entry.Status === 'missed') && onDismissEntry && (
                        <button
                          onClick={() => {
                            setDismissingEntryId(entry.PlannedEntryID);
                            setShowDismissModal(true);
                            setExpandedEntryActions(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-gray-700"
                        >
                          Dispensar
                        </button>
                      )}
                      {entry.Status === 'dismissed' && onUndismissEntry && (
                        <button
                          onClick={() => {
                            onUndismissEntry(entry.PlannedEntryID);
                            setExpandedEntryActions(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-gray-700"
                        >
                          Reativar
                        </button>
                      )}
                      {onEditEntry && (
                        <button
                          onClick={() => {
                            onEditEntry(entry);
                            setExpandedEntryActions(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-gray-700"
                        >
                          Editar
                        </button>
                      )}
                      {onDeleteEntry && (
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${entry.Description}"?`)) {
                              onDeleteEntry(entry.PlannedEntryID);
                            }
                            setExpandedEntryActions(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 text-red-600"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dismiss Modal */}
      {showDismissModal && month && year && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Dispensar Entrada</h3>
            <p className="text-sm text-gray-600 mb-4">
              Dispensar esta entrada para {new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo (opcional)
              </label>
              <textarea
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Ex: Não houve cobrança este mês"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDismissModal(false);
                  setDismissReason('');
                  setDismissingEntryId(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
