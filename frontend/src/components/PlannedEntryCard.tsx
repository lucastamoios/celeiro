import { useState, useCallback, useEffect } from 'react';
import type { PlannedEntryWithStatus, PlannedEntryStatusType } from '../types/budget';
import { getStatusBadgeClasses, getStatusLabel } from '../types/budget';
import { useDropdownClose } from '../hooks/useDropdownClose';

interface PlannedEntryCardProps {
  entry: PlannedEntryWithStatus;
  categoryName: string;
  month: number;
  year: number;
  goalName?: string; // Name of linked savings goal (if any)
  onMatch?: (entryId: number) => void;
  onUnmatch?: (entryId: number) => void;
  onDismiss?: (entryId: number, reason?: string) => void;
  onUndismiss?: (entryId: number) => void;
  onEdit?: (entry: PlannedEntryWithStatus) => void;
  onDelete?: (entryId: number) => void;
}

export default function PlannedEntryCard({
  entry,
  categoryName,
  month,
  year,
  goalName,
  onMatch,
  onUnmatch,
  onDismiss,
  onUndismiss,
  onEdit,
  onDelete,
}: PlannedEntryCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissReason, setDismissReason] = useState('');

  // Handle click outside and Escape key for dropdown menu
  const actionsMenuRef = useDropdownClose(showActions, () => setShowActions(false));

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDismissModal) {
        setShowDismissModal(false);
        setDismissReason('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDismissModal]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowDismissModal(false);
      setDismissReason('');
    }
  }, []);

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getExpectedDayRange = () => {
    if (entry.ExpectedDayStart && entry.ExpectedDayEnd) {
      if (entry.ExpectedDayStart === entry.ExpectedDayEnd) {
        return `Dia ${entry.ExpectedDayStart}`;
      }
      return `Dias ${entry.ExpectedDayStart} - ${entry.ExpectedDayEnd}`;
    }
    if (entry.ExpectedDay) {
      return `Dia ${entry.ExpectedDay}`;
    }
    return null;
  };

  const getAmountRange = () => {
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

  const getStatusIcon = (status: PlannedEntryStatusType) => {
    switch (status) {
      case 'matched':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'scheduled':
        // Clock icon - on time, waiting
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
      case 'missed':
        // Warning icon - overdue
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'dismissed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(entry.PlannedEntryID, dismissReason || undefined);
      setShowDismissModal(false);
      setDismissReason('');
    }
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border-l-4 p-4 hover:shadow-md transition-shadow ${
        entry.Status === 'matched' ? 'border-sage-500' :
        entry.Status === 'scheduled' ? 'border-wheat-500' :
        entry.Status === 'pending' || entry.Status === 'missed' ? 'border-rust-500' :
        'border-stone-400'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-900">{entry.Description}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-1 rounded bg-stone-100 text-stone-700">
                {categoryName}
              </span>
              <span className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${getStatusBadgeClasses(entry.Status)}`}>
                {getStatusIcon(entry.Status)}
                {getStatusLabel(entry.Status)}
              </span>
              {entry.IsRecurrent && (
                <span className="text-xs px-2 py-1 rounded bg-wheat-100 text-wheat-800">
                  Recorrente
                </span>
              )}
              {entry.EntryType === 'income' && (
                <span className="text-xs px-2 py-1 rounded bg-sage-100 text-sage-800">
                  Receita
                </span>
              )}
              {entry.LinkedPattern && (
                <span
                  className="text-xs px-2 py-1 rounded bg-terra-100 text-terra-800 flex items-center gap-1"
                  title={`Vinculado ao padrão: ${entry.LinkedPattern.DescriptionPattern || entry.LinkedPattern.TargetDescription}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Padrão
                </span>
              )}
              {goalName && (
                <span
                  className="text-xs px-2 py-1 rounded bg-wheat-100 text-wheat-800 flex items-center gap-1"
                  title={`Vinculado à meta: ${goalName}`}
                >
                  🎯 {goalName}
                </span>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              aria-label="Actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-stone-600"
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
              <div ref={actionsMenuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-10">
                {(entry.Status === 'scheduled' || entry.Status === 'pending' || entry.Status === 'missed') && onMatch && (
                  <button
                    onClick={() => {
                      onMatch(entry.PlannedEntryID);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700"
                  >
                    Vincular Transação
                  </button>
                )}
                {entry.Status === 'matched' && onUnmatch && (
                  <button
                    onClick={() => {
                      onUnmatch(entry.PlannedEntryID);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700"
                  >
                    Desvincular
                  </button>
                )}
                {(entry.Status === 'scheduled' || entry.Status === 'pending' || entry.Status === 'missed') && onDismiss && (
                  <button
                    onClick={() => {
                      setShowDismissModal(true);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700"
                  >
                    Dispensar
                  </button>
                )}
                {entry.Status === 'dismissed' && onUndismiss && (
                  <button
                    onClick={() => {
                      onUndismiss(entry.PlannedEntryID);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700"
                  >
                    Reativar
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(entry);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700"
                  >
                    Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir "${entry.Description}"? Esta ação não pode ser desfeita.`)) {
                        onDelete(entry.PlannedEntryID);
                      }
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-rust-50 text-rust-600"
                  >
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Entry Details */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-sm text-stone-600">Valor Esperado</div>
            <div className="text-lg font-semibold text-stone-900">
              {getAmountRange()}
            </div>
          </div>
          {getExpectedDayRange() && (
            <div>
              <div className="text-sm text-stone-600">Período</div>
              <div className="text-lg font-semibold text-stone-900">
                {getExpectedDayRange()}
              </div>
            </div>
          )}
        </div>

        {/* Matched Transaction Info */}
        {entry.Status === 'matched' && entry.MatchedAmount && (
          <div className="border-t border-stone-200 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-stone-600">Valor Recebido</div>
                <div className="text-lg font-semibold text-sage-600">
                  {formatCurrency(entry.MatchedAmount)}
                </div>
              </div>
              {entry.MatchedAt && (
                <div className="text-sm text-stone-500">
                  em {formatDate(entry.MatchedAt)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overdue Warning */}
        {(entry.Status === 'pending' || entry.Status === 'missed') && (
          <div className="mt-3 text-xs text-rust-700 bg-rust-50 px-3 py-2 rounded border border-rust-200">
            <strong>⚠️ Atrasado:</strong> O período esperado já passou e nenhuma transação foi vinculada.
          </div>
        )}
      </div>

      {/* Dismiss Modal */}
      {showDismissModal && (
        <div
          className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Dispensar Entrada Planejada</h3>
            <p className="text-sm text-stone-600 mb-4">
              Dispensar "{entry.Description}" para {new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Motivo (opcional)
              </label>
              <textarea
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wheat-500"
                rows={3}
                placeholder="Ex: Não houve cobrança este mês"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDismissModal(false);
                  setDismissReason('');
                }}
                className="px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-700"
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
