import { useMemo } from 'react';
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
}: CategoryTransactionsModalProps) {
  const { handleBackdropClick, handleBackdropMouseDown } = useModalDismiss(onClose);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(isNaN(num) ? 0 : num);
  };

  const formatDate = (dateString: string) => {
    // Append T00:00:00 to parse as local time, not UTC
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR', {
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

  // Get unmatched planned entries (pending/missed) for this category
  const unmatchedEntries = useMemo(() => {
    return plannedEntries.filter(entry =>
      entry.CategoryID === categoryId &&
      (entry.Status === 'pending' || entry.Status === 'missed')
    );
  }, [plannedEntries, categoryId]);

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
          {/* Unmatched Planned Entries Section */}
          {unmatchedEntries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                <span className="text-terra-600">📋</span>
                Entradas Planejadas Pendentes
              </h3>
              <div className="space-y-2">
                {unmatchedEntries.map(entry => (
                  <div
                    key={entry.PlannedEntryID}
                    onClick={() => onPlannedEntryClick?.(entry)}
                    className={`p-3 rounded-lg border-l-4 transition-colors group ${
                      entry.Status === 'missed'
                        ? 'bg-rust-50 border-rust-400 hover:bg-rust-100'
                        : 'bg-terra-50 border-terra-400 hover:bg-terra-100'
                    } ${onPlannedEntryClick ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-900 truncate">
                            {entry.Description}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            entry.Status === 'missed'
                              ? 'bg-rust-100 text-rust-700'
                              : 'bg-terra-100 text-terra-700'
                          }`}>
                            {entry.Status === 'missed' ? '⚠️ Atrasado' : '⏳ Pendente'}
                          </span>
                        </div>
                        <div className="text-sm text-stone-500 mt-1 tabular-nums">
                          Esperado: {formatCurrency(entry.Amount)}
                          {entry.ExpectedDay && (
                            <span className="ml-2">• Dia {entry.ExpectedDay}</span>
                          )}
                        </div>
                      </div>
                      {onPlannedEntryClick && (
                        <div className="flex-shrink-0 text-stone-400 group-hover:text-stone-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
