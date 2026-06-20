import { useState, useEffect, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CategoryBudget, PlannedEntryWithStatus, PlannedEntryStatusType } from '../types/budget';
import { getVarianceStatus, VARIANCE_THRESHOLDS, getStatusBadgeClasses, getStatusLabel } from '../types/budget';
import DropdownMenu from './ui/DropdownMenu';

// Shared grid template for the budget ledger. The dashboard header row and every
// category row use the same track sizing so the columns line up vertically.
// Tracks: Categoria (flexible) | Estimado | Realizado | Variação | Status | actions.
// Display (grid vs hidden) is set by the caller so it only applies from sm upward.
export const LEDGER_GRID =
  'grid-cols-[minmax(0,1.8fr)_7rem_7rem_11rem_6rem_4.5rem] items-center gap-4';

interface CategoryBudgetCardProps {
  budget: CategoryBudget;
  categoryName: string;
  actualSpent: string; // Current spending/income for this category
  isIncome?: boolean; // Whether this is an income category
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
  onCreatePatternFromMatch?: (entry: PlannedEntryWithStatus, month: number, year: number) => void;
  onCardClick?: () => void; // Click handler to open transactions modal

  // Drag & Drop Planned Entries
  dndDropId?: string;
  isDropTargetDisabled?: boolean;
  isDropTargetHighlighted?: boolean;
}

function formatCurrencyBRL(amount: string | number) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(isNaN(num) ? 0 : num);
}

function getStatusIcon(status: PlannedEntryStatusType) {
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
}

function getExpectedDayRange(entry: PlannedEntryWithStatus) {
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
}

function getEntryAmountRange(entry: PlannedEntryWithStatus) {
  if (entry.AmountMin && entry.AmountMax) {
    const min = formatCurrencyBRL(entry.AmountMin);
    const max = formatCurrencyBRL(entry.AmountMax);
    if (entry.AmountMin === entry.AmountMax) {
      return max;
    }
    return `${min} - ${max}`;
  }
  return formatCurrencyBRL(entry.Amount);
}

function DraggablePlannedEntryRow({
  entry,
  onEditEntry,
  actions,
}: {
  entry: PlannedEntryWithStatus;
  onEditEntry?: (entry: PlannedEntryWithStatus) => void;
  actions?: React.ReactNode;
}) {
  const dragDisabled = entry.Status === 'dismissed';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.PlannedEntryID,
    disabled: dragDisabled,
  });

  const expectedDayRange = getExpectedDayRange(entry);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`bg-stone-50 rounded-lg border-l-4 p-3 shadow-warm-sm transition-all ${
        entry.Status === 'matched' ? 'border-sage-500' :
        entry.Status === 'pending' ? 'border-terra-500' :
        entry.Status === 'missed' ? 'border-rust-500' :
        'border-stone-400'
      } ${onEditEntry ? 'cursor-pointer hover:shadow-warm-md hover:bg-stone-50' : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('button') && !target.closest('[data-dnd-handle]') && onEditEntry) {
          onEditEntry(entry);
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-900 truncate">{entry.Description}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${getStatusBadgeClasses(entry.Status)}`}>
              {getStatusIcon(entry.Status)}
              {getStatusLabel(entry.Status)}
            </span>
            {entry.IsRecurrent && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-wheat-100 text-wheat-700">🔄</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-stone-600">
            <span className="tabular-nums">{getEntryAmountRange(entry)}</span>
            {expectedDayRange && (
              <>
                <span className="text-stone-300">•</span>
                <span>{expectedDayRange}</span>
              </>
            )}
            {entry.Status === 'matched' && entry.MatchedAmount && (
              <>
                <span className="text-stone-300">•</span>
                <span className="text-sage-600 font-medium tabular-nums">Recebido: {formatCurrencyBRL(entry.MatchedAmount)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            data-dnd-handle
            className={`p-1 rounded-md ${dragDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-grab hover:bg-stone-100'} transition-colors`}
            aria-label="Arrastar entrada"
            {...listeners}
            {...attributes}
            disabled={dragDisabled}
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6h.01M14 6h.01M10 12h.01M14 12h.01M10 18h.01M14 18h.01" />
            </svg>
          </button>

          <div className="relative">{actions}</div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryBudgetCard({
  budget,
  categoryName,
  actualSpent,
  isIncome = false,
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
  onCreatePatternFromMatch,
  onCardClick,
  dndDropId,
  isDropTargetDisabled = false,
  isDropTargetHighlighted = false,
}: CategoryBudgetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissingEntryId, setDismissingEntryId] = useState<number | null>(null);
  const [dismissReason, setDismissReason] = useState('');

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



  // Calculate planned entries sum for this category (expense entries, not dismissed).
  // Matched entries contribute the actual transaction amount; unmatched entries
  // contribute the top of their range (or the display amount).
  const plannedEntriesSum = plannedEntries
    .filter(e => e.EntryType === 'expense' && e.Status !== 'dismissed')
    .reduce((sum, e) => {
      const amount = e.Status === 'matched' && e.MatchedAmount
        ? parseFloat(e.MatchedAmount)
        : parseFloat(e.AmountMax || e.Amount || '0');
      return sum + (amount || 0);
    }, 0);

  // Estimado = controlled + planned entries
  const controlledNum = parseFloat(budget.ControlledAmount || '0') || 0;
  const estimatedNum = controlledNum + plannedEntriesSum;

  // Calculate variance against estimated total
  const actualNum = parseFloat(actualSpent || '0') || 0;
  const variance = actualNum - estimatedNum;
  const variancePercent = estimatedNum > 0 ? (variance / estimatedNum) * 100 : 0;

  // For income, positive variance (earned more) is GOOD; for expenses, positive variance (spent more) is BAD
  // We invert the variance percent for income so the status thresholds work correctly
  const effectiveVariancePercent = isIncome ? -variancePercent : variancePercent;
  const varianceStatus = getVarianceStatus(effectiveVariancePercent);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-rust-100 text-rust-700 border-rust-300';
      case 'warning':
        return 'bg-terra-100 text-terra-700 border-terra-300';
      case 'on_track':
        return 'bg-sage-100 text-sage-700 border-sage-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
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
    // For income: positive variance = good (green), negative = bad (red/orange)
    // For expenses: positive variance = bad (red/orange), negative = good (green)
    if (isIncome) {
      if (variancePercent < -VARIANCE_THRESHOLDS.MAJOR) return 'text-rust-600 font-semibold';
      if (variancePercent < -VARIANCE_THRESHOLDS.MINOR) return 'text-terra-600';
      if (variancePercent > 0) return 'text-sage-600';
      return 'text-stone-600';
    } else {
      if (variancePercent > VARIANCE_THRESHOLDS.MAJOR) return 'text-rust-600 font-semibold';
      if (variancePercent > VARIANCE_THRESHOLDS.MINOR) return 'text-terra-600';
      if (variancePercent < 0) return 'text-sage-600';
      return 'text-stone-600';
    }
  };

  // Count entries by status
  const entryStats = {
    total: plannedEntries.length,
    matched: plannedEntries.filter(e => e.Status === 'matched').length,
    pending: plannedEntries.filter(e => e.Status === 'pending').length,
    missed: plannedEntries.filter(e => e.Status === 'missed').length,
    dismissed: plannedEntries.filter(e => e.Status === 'dismissed').length,
  };

  const hasEntries = entryStats.total > 0;

  // Clicking a row opens the category's transactions modal; the chevron toggles
  // the planned entries. Rows without a modal handler fall back to expanding.
  const handleSummaryClick = () => {
    if (onCardClick) {
      onCardClick();
    } else if (hasEntries) {
      setIsExpanded((v) => !v);
    }
  };

  const chevronIcon = hasEntries ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded((v) => !v);
      }}
      className="p-1 -m-1 shrink-0 rounded hover:bg-stone-200/70 transition-colors"
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Ocultar entradas planejadas' : 'Ver entradas planejadas'}
      title={isExpanded ? 'Ocultar entradas planejadas' : 'Ver entradas planejadas'}
    >
      <svg
        className={`w-4 h-4 text-stone-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  ) : (
    <span className="w-4 h-4 shrink-0" aria-hidden="true" />
  );

  const inlineBadges = (
    <>
      {budget.IsConsolidated && (
        <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-sage-100 text-sage-700 whitespace-nowrap">Consolidado</span>
      )}
      {entryStats.missed > 0 && (
        <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-rust-100 text-rust-700 whitespace-nowrap">
          ⚠️ {entryStats.missed} atrasada{entryStats.missed > 1 ? 's' : ''}
        </span>
      )}
    </>
  );

  const entryDots = hasEntries ? (
    <span className="inline-flex items-center gap-1 shrink-0">
      {entryStats.matched > 0 && <span className="w-1.5 h-1.5 rounded-full bg-sage-500" title={`${entryStats.matched} recebidas`} />}
      {entryStats.pending > 0 && <span className="w-1.5 h-1.5 rounded-full bg-terra-500" title={`${entryStats.pending} pendentes`} />}
      {entryStats.missed > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rust-500" title={`${entryStats.missed} atrasadas`} />}
      {entryStats.dismissed > 0 && <span className="w-1.5 h-1.5 rounded-full bg-stone-400" title={`${entryStats.dismissed} dispensadas`} />}
    </span>
  ) : null;

  const statusBadge = (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(varianceStatus)}`}>
      {getStatusText(varianceStatus)}
    </span>
  );

  const varianceContent = (
    <span className={`tabular-nums ${getVarianceColor()}`}>
      {variance >= 0 ? '+' : ''}
      {formatCurrencyBRL(variance.toFixed(2))}
      <span className="text-xs ml-1 opacity-80">
        ({variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
      </span>
    </span>
  );

  const categoryActions = !budget.IsConsolidated ? (
    <DropdownMenu
      width={192}
      buttonAriaLabel="Ações"
      buttonClassName="p-1.5 hover:bg-stone-100 rounded-full transition-colors"
      buttonContent={
        <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      }
    >
      {(close) => (
        <>
          {onEdit && (
            <button type="button" onClick={() => { onEdit(budget); close(); }} className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 text-stone-700">
              Editar orçamento
            </button>
          )}
          {onConsolidate && canConsolidate && (
            <button type="button" onClick={() => { onConsolidate(budget.CategoryBudgetID); close(); }} className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 text-stone-700">
              Consolidar
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Tem certeza que deseja excluir o orçamento de "${categoryName}"?`)) {
                  onDelete(budget.CategoryBudgetID);
                }
                close();
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-rust-50 text-rust-600"
            >
              Excluir
            </button>
          )}
        </>
      )}
    </DropdownMenu>
  ) : null;

  const hasWarning =
    (!isIncome && (varianceStatus === 'warning' || varianceStatus === 'critical')) ||
    (isIncome && variance < 0 && Math.abs(variancePercent) >= VARIANCE_THRESHOLDS.MINOR);

  return (
    <div
      className={`relative transition-colors ${entryStats.missed > 0 ? 'border-l-4 border-rust-400' : ''} ${
        isDropTargetHighlighted
          ? isDropTargetDisabled
            ? 'bg-rust-50 ring-1 ring-inset ring-rust-400'
            : 'bg-sage-50 ring-1 ring-inset ring-sage-400'
          : ''
      } ${isDropTargetDisabled ? 'opacity-70' : ''}`}
      data-dnd-drop-id={dndDropId}
    >
      {/* Desktop ledger row */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleSummaryClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSummaryClick();
          }
        }}
        className={`hidden sm:grid ${LEDGER_GRID} px-4 py-3 cursor-pointer hover:bg-stone-100/60 transition-colors`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {chevronIcon}
          <span className="font-display font-semibold text-stone-900 truncate">{categoryName}</span>
          {entryDots}
          {inlineBadges}
        </div>
        <div className="text-right tabular-nums font-medium text-stone-900">{formatCurrencyBRL(estimatedNum)}</div>
        <div className="text-right tabular-nums font-medium text-stone-900">{formatCurrencyBRL(actualSpent)}</div>
        <div className="text-right text-sm font-medium whitespace-nowrap">{varianceContent}</div>
        <div className="flex justify-center">{statusBadge}</div>
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          {categoryActions}
        </div>
      </div>

      {/* Mobile stacked row */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleSummaryClick}
        className="sm:hidden px-4 py-3 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {chevronIcon}
          <span className="font-display font-semibold text-stone-900 truncate flex-1">{categoryName}</span>
          {statusBadge}
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            {categoryActions}
          </div>
        </div>
        {(budget.IsConsolidated || hasEntries) && (
          <div className="flex items-center gap-2 mt-1 ml-6">
            {entryDots}
            {inlineBadges}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mt-2 ml-6">
          <div>
            <div className="text-xs text-stone-500">Estimado</div>
            <div className="text-sm tabular-nums font-medium text-stone-900">{formatCurrencyBRL(estimatedNum)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">{isIncome ? 'Ganho' : 'Gasto'}</div>
            <div className="text-sm tabular-nums font-medium text-stone-900">{formatCurrencyBRL(actualSpent)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Variação</div>
            <div className="text-sm font-medium">{varianceContent}</div>
          </div>
        </div>
      </div>

      {/* Variance warning (full width, only when present) */}
      {hasWarning && (
        <div className="px-4 pb-3 sm:pl-6 space-y-2">
          {varianceStatus === 'warning' && !isIncome && (
            <div className="text-xs text-terra-700 bg-terra-50 px-3 py-2 rounded border border-terra-200">
              <strong>⚠️ Atenção:</strong> Gasto {variancePercent.toFixed(1)}% acima do planejado
            </div>
          )}
          {varianceStatus === 'critical' && !isIncome && (
            <div className="text-xs text-rust-700 bg-rust-50 px-3 py-2 rounded border border-rust-200">
              <strong>🚨 Crítico:</strong> Gasto {variancePercent.toFixed(1)}% acima do planejado
            </div>
          )}
          {isIncome && variance < 0 && Math.abs(variancePercent) >= VARIANCE_THRESHOLDS.MINOR && (
            <div className="text-xs text-terra-700 bg-terra-50 px-3 py-2 rounded border border-terra-200">
              <strong>⚠️ Atenção:</strong> Ganho {Math.abs(variancePercent).toFixed(1)}% abaixo do planejado
            </div>
          )}
        </div>
      )}

      {/* Expanded Entries Section */}
      {isExpanded && entryStats.total > 0 && (
        <div className="border-t border-stone-200 bg-stone-100/50 p-3 space-y-2">
          {/* Estimado breakdown */}
          {(controlledNum > 0 || plannedEntriesSum > 0) && (
            <div className="px-3 py-2 bg-stone-100 rounded-lg text-sm mb-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Controlado</span>
                <span className="font-medium text-stone-700 tabular-nums">{formatCurrencyBRL(controlledNum)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Planejado ({plannedEntries.filter(e => e.EntryType === 'expense' && e.Status !== 'dismissed').length})</span>
                <span className="font-medium text-stone-700 tabular-nums">{formatCurrencyBRL(plannedEntriesSum)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                <span className="text-stone-600 font-medium">Estimado</span>
                <span className="font-semibold text-stone-900 tabular-nums">{formatCurrencyBRL(estimatedNum)}</span>
              </div>
            </div>
          )}
          {plannedEntries.map((entry) => (
            <DraggablePlannedEntryRow
              key={entry.PlannedEntryID}
              entry={entry}
              onEditEntry={onEditEntry}
              actions={
                <DropdownMenu
                  width={176}
                  buttonAriaLabel="Ações"
                  buttonClassName="p-1 hover:bg-stone-100 rounded-full transition-colors"
                  buttonContent={
                    <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  }
                >
                  {(close) => (
                    <>
                      {(entry.Status === 'pending' || entry.Status === 'missed') && onMatchEntry && (
                        <button
                          type="button"
                          onClick={() => {
                            onMatchEntry(entry.PlannedEntryID);
                            close();
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-stone-50 text-stone-700"
                        >
                          Vincular
                        </button>
                      )}
                      {entry.Status === 'matched' && onUnmatchEntry && (
                        <button
                          type="button"
                          onClick={() => {
                            onUnmatchEntry(entry.PlannedEntryID);
                            close();
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-stone-50 text-stone-700"
                        >
                          Desvincular
                        </button>
                      )}
                      {(entry.Status === 'pending' || entry.Status === 'missed') && onDismissEntry && (
                        <button
                          type="button"
                          onClick={() => {
                            setDismissingEntryId(entry.PlannedEntryID);
                            setShowDismissModal(true);
                            close();
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-stone-50 text-stone-700"
                        >
                          Dispensar
                        </button>
                      )}
                      {entry.Status === 'dismissed' && onUndismissEntry && (
                        <button
                          type="button"
                          onClick={() => {
                            onUndismissEntry(entry.PlannedEntryID);
                            close();
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-stone-50 text-stone-700"
                        >
                          Reativar
                        </button>
                      )}
                      {onEditEntry && (
                        <button
                          type="button"
                          onClick={() => {
                            onEditEntry(entry);
                            close();
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-stone-50 text-stone-700"
                        >
                          Editar
                        </button>
                      )}
                      {entry.Status === 'matched' && entry.MatchedTransactionID && !entry.PatternID && onCreatePatternFromMatch && month && year && (
                        <button
                          type="button"
                          onClick={() => {
                            onCreatePatternFromMatch(entry, month, year);
                            close();
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-wheat-700 hover:bg-wheat-50 flex items-center gap-2"
                        >
                          <span>✨</span>
                          Criar padrão do vínculo
                        </button>
                      )}
                      {onDeleteEntry && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Excluir "${entry.Description}"?`)) {
                              onDeleteEntry(entry.PlannedEntryID);
                            }
                            close();
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-rust-50 text-rust-600"
                        >
                          Excluir
                        </button>
                      )}
                    </>
                  )}
                </DropdownMenu>
              }
            />
          ))}
        </div>
      )}

      {/* Dismiss Modal */}
      {showDismissModal && month && year && (
        <div
          className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
        >
          <div className="bg-stone-50 rounded-2xl shadow-warm-xl p-6 w-96 max-w-[90vw]">
            <h3 className="font-display text-lg font-semibold text-stone-900 mb-4">Dispensar Entrada</h3>
            <p className="text-sm text-stone-600 mb-4">
              Dispensar esta entrada para {new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Motivo (opcional)
              </label>
              <textarea
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="input"
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
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDismiss}
                className="btn-primary"
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
