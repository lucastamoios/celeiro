import { useMemo, useState } from 'react';
import type { Transaction } from '../types/transaction';
import type { PlannedEntryWithStatus } from '../types/budget';
import type { Category } from '../types/category';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { parseTransactionDate } from '../utils/date';

interface CategoryTransactionsModalProps {
  categoryId: number;
  categoryName: string;
  month: number;
  year: number;
  transactions: Transaction[];
  plannedEntries: PlannedEntryWithStatus[];
  categories: Map<number, Category>;
  actualSpent: string;
  plannedAmount: string;
  isIncome?: boolean;
  onClose: () => void;
  onTransactionClick?: (transaction: Transaction) => void;
  onPlannedEntryClick?: (entry: PlannedEntryWithStatus) => void;
  onAddPlannedEntry?: () => void;
  onUpdatePlannedEntryAmount?: (entryId: number, newAmount: number) => Promise<void>;
}

export default function CategoryTransactionsModal({
  categoryId,
  categoryName,
  month,
  year,
  transactions,
  plannedEntries,
  categories,
  actualSpent,
  plannedAmount,
  isIncome = false,
  onClose,
  onTransactionClick,
  onPlannedEntryClick,
  onAddPlannedEntry,
  onUpdatePlannedEntryAmount,
}: CategoryTransactionsModalProps) {
  const { handleBackdropClick, handleBackdropMouseDown } = useModalDismiss(onClose);

  // Inline editing state
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(isNaN(num) ? 0 : num);
  };

  const formatDate = (dateString: string) => {
    return parseTransactionDate(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Get category details
  const category = categories.get(categoryId);

  // Build a map of transaction_id -> planned entry for quick lookup
  const plannedEntryByTransactionId = useMemo(() => {
    const map = new Map<number, PlannedEntryWithStatus>();
    plannedEntries.forEach(entry => {
      if (entry.MatchedTransactionID) {
        map.set(entry.MatchedTransactionID, entry);
      }
    });
    return map;
  }, [plannedEntries]);

  // Filter transactions for this category and month
  const categoryTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.category_id !== categoryId) return false;
      if (tx.is_ignored) return false;

      // Parse as local time to avoid timezone shift
      const txDate = parseTransactionDate(tx.transaction_date);
      const txMonth = txDate.getMonth() + 1;
      const txYear = txDate.getFullYear();

      return txMonth === month && txYear === year;
    }).sort((a, b) => {
      // Sort by date descending (most recent first)
      return parseTransactionDate(b.transaction_date).getTime() - parseTransactionDate(a.transaction_date).getTime();
    });
  }, [transactions, categoryId, month, year]);

  // Get ALL planned entries for this category (for the new "All Entries" section)
  const allCategoryEntries = useMemo(() => {
    return plannedEntries.filter(entry => entry.CategoryID === categoryId);
  }, [plannedEntries, categoryId]);

  // Inline editing handlers
  const handleStartEdit = (entry: PlannedEntryWithStatus) => {
    setEditingEntryId(entry.PlannedEntryID);
    setEditingAmount(entry.Amount.toString());
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditingAmount('');
  };

  const handleSaveEdit = async (entryId: number) => {
    if (!onUpdatePlannedEntryAmount) return;

    const newAmount = parseFloat(editingAmount);
    if (isNaN(newAmount) || newAmount < 0) return;

    await onUpdatePlannedEntryAmount(entryId, newAmount);
    setEditingEntryId(null);
    setEditingAmount('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, entryId: number) => {
    if (e.key === 'Enter') {
      handleSaveEdit(entryId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Calculate totals
  const totalFromTransactions = useMemo(() => {
    return categoryTransactions.reduce((sum, tx) => {
      return sum + Math.abs(parseFloat(tx.amount));
    }, 0);
  }, [categoryTransactions]);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div
      className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-warm-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-gradient-to-r from-wheat-50 to-wheat-100 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{category?.icon || '📊'}</span>
              <div>
                <h2 className="text-xl font-bold text-stone-900">{categoryName}</h2>
                <p className="text-sm text-stone-600 capitalize">{monthName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white/70 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-500">Planejado</p>
              <p className="text-lg font-semibold text-stone-900 tabular-nums">
                {formatCurrency(plannedAmount)}
              </p>
            </div>
            <div className="bg-white/70 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-500">{isIncome ? 'Recebido' : 'Gasto'}</p>
              <p className={`text-lg font-semibold tabular-nums ${
                parseFloat(actualSpent) > parseFloat(plannedAmount) && !isIncome
                  ? 'text-rust-600'
                  : 'text-stone-900'
              }`}>
                {formatCurrency(actualSpent)}
              </p>
            </div>
            <div className="bg-white/70 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-500">Transações</p>
              <p className="text-lg font-semibold text-stone-900">
                {categoryTransactions.length}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* All Planned Entries Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <span className="text-terra-600">📋</span>
                Entradas Planejadas
                <span className="text-xs font-normal text-stone-500">
                  ({allCategoryEntries.length})
                </span>
              </h3>
              {onAddPlannedEntry && (
                <button
                  onClick={onAddPlannedEntry}
                  className="text-xs px-2 py-1 rounded-lg bg-terra-100 text-terra-700 hover:bg-terra-200 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar
                </button>
              )}
            </div>

            {allCategoryEntries.length === 0 ? (
              <div className="text-center py-4 text-stone-500 bg-stone-50 rounded-lg">
                <p className="text-sm">Nenhuma entrada planejada nesta categoria</p>
                {onAddPlannedEntry && (
                  <button
                    onClick={onAddPlannedEntry}
                    className="mt-2 text-xs text-terra-600 hover:text-terra-700 underline"
                  >
                    Criar primeira entrada
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {allCategoryEntries.map(entry => {
                  const isEditing = editingEntryId === entry.PlannedEntryID;
                  const statusColors: Record<string, string> = {
                    matched: 'bg-sage-50 border-sage-200',
                    pending: 'bg-terra-50 border-terra-300',
                    missed: 'bg-rust-50 border-rust-300',
                    scheduled: 'bg-stone-50 border-stone-300',
                    dismissed: 'bg-stone-100 border-stone-300',
                  };
                  const statusBadges: Record<string, { bg: string; text: string; label: string }> = {
                    matched: { bg: 'bg-sage-100', text: 'text-sage-700', label: '✓ Vinculado' },
                    pending: { bg: 'bg-terra-100', text: 'text-terra-700', label: '⏳ Pendente' },
                    missed: { bg: 'bg-rust-100', text: 'text-rust-700', label: '⚠️ Atrasado' },
                    scheduled: { bg: 'bg-stone-100', text: 'text-stone-700', label: '📅 Agendado' },
                    dismissed: { bg: 'bg-stone-200', text: 'text-stone-500', label: '✕ Dispensado' },
                  };
                  const badge = statusBadges[entry.Status] || statusBadges.pending;

                  return (
                    <div
                      key={entry.PlannedEntryID}
                      className={`p-3 rounded-lg border transition-colors ${statusColors[entry.Status] || statusColors.pending}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-medium text-stone-900 truncate ${onPlannedEntryClick ? 'cursor-pointer hover:underline' : ''}`}
                              onClick={() => onPlannedEntryClick?.(entry)}
                            >
                              {entry.Description}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          </div>
                          {entry.ExpectedDay && (
                            <p className="text-xs text-stone-500 mt-1">
                              Dia {entry.ExpectedDay} do mês
                            </p>
                          )}
                        </div>

                        {/* Amount - inline editable */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editingAmount}
                                onChange={(e) => setEditingAmount(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, entry.PlannedEntryID)}
                                onBlur={() => handleSaveEdit(entry.PlannedEntryID)}
                                autoFocus
                                className="w-24 px-2 py-1 text-sm border border-terra-300 rounded focus:outline-none focus:ring-2 focus:ring-terra-500 tabular-nums"
                                min="0"
                                step="0.01"
                              />
                              <button
                                onClick={() => handleSaveEdit(entry.PlannedEntryID)}
                                className="p-1 text-sage-600 hover:text-sage-700"
                                title="Salvar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 text-stone-400 hover:text-stone-600"
                                title="Cancelar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`font-semibold tabular-nums ${onUpdatePlannedEntryAmount ? 'cursor-pointer hover:bg-white/50 px-2 py-1 rounded' : ''}`}
                              onClick={(e) => {
                                if (onUpdatePlannedEntryAmount) {
                                  e.stopPropagation();
                                  handleStartEdit(entry);
                                }
                              }}
                              title={onUpdatePlannedEntryAmount ? 'Clique para editar' : undefined}
                            >
                              {formatCurrency(entry.Amount)}
                            </span>
                          )}

                          {/* Edit button for full entry */}
                          {onPlannedEntryClick && !isEditing && (
                            <button
                              onClick={() => onPlannedEntryClick(entry)}
                              className="p-1 text-stone-400 hover:text-stone-600"
                              title="Editar entrada"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <span className="text-sage-600">💰</span>
              Transações
            </h3>

            {categoryTransactions.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <p className="mb-2">Nenhuma transação nesta categoria</p>
                <p className="text-sm text-stone-400">
                  As transações aparecerão aqui quando forem categorizadas
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {categoryTransactions.map(tx => {
                  const linkedEntry = plannedEntryByTransactionId.get(tx.transaction_id);

                  return (
                    <div
                      key={tx.transaction_id}
                      onClick={() => onTransactionClick?.(tx)}
                      className={`p-3 rounded-lg border transition-colors ${
                        linkedEntry
                          ? 'bg-sage-50 border-sage-200 hover:bg-sage-100'
                          : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                      } ${onTransactionClick ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-stone-900 truncate">
                              {tx.description}
                            </span>
                            {linkedEntry && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Vinculado
                              </span>
                            )}
                          </div>

                          {/* Show linked entry info */}
                          {linkedEntry && (
                            <div className="mt-1 text-xs text-sage-600 flex items-center gap-1">
                              <span>📋</span>
                              <span className="truncate">{linkedEntry.Description}</span>
                            </div>
                          )}

                          <div className="flex items-baseline gap-1 mt-1 min-w-0">
                            <span className="text-sm text-stone-500 tabular-nums flex-shrink-0">
                              {formatDate(tx.transaction_date)}
                            </span>
                            {tx.original_description && tx.original_description !== tx.description && (
                              <span className="text-xs text-stone-400 truncate min-w-0">
                                • {tx.original_description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`text-right flex-shrink-0 ${
                          tx.transaction_type === 'credit' ? 'text-sage-600' : 'text-stone-900'
                        }`}>
                          <span className="font-semibold tabular-nums">
                            {tx.transaction_type === 'credit' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-stone-600">
              Total: <span className="font-semibold tabular-nums">{formatCurrency(totalFromTransactions)}</span>
            </div>
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
