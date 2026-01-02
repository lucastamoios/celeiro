import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { PlannedEntryWithStatus } from '../types/budget';
import type { Category } from '../types/category';
import type { Transaction } from '../types/transaction';
import { getPlannedEntriesForMonth, matchPlannedEntry } from '../api/budget';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface TransactionPlannedEntryLinkModalProps {
  transaction: Transaction;
  categories: Map<number, Category>;
  onClose: () => void;
  onLink: () => void;
}

export default function TransactionPlannedEntryLinkModal({
  transaction,
  categories,
  onClose,
  onLink,
}: TransactionPlannedEntryLinkModalProps) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<PlannedEntryWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | 'all'>(
    transaction.category_id || 'all'
  );
  const [linkingId, setLinkingId] = useState<number | null>(null);

  const { handleBackdropClick, handleBackdropMouseDown } = useModalDismiss(onClose);

  // Get month/year from transaction date
  const txDate = new Date(transaction.transaction_date);
  const txMonth = txDate.getMonth() + 1;
  const txYear = txDate.getFullYear();

  // Fetch planned entries for the transaction's month
  useEffect(() => {
    const fetchEntries = async () => {
      if (!token) return;

      try {
        const result = await getPlannedEntriesForMonth(txMonth, txYear, {
          token,
          organizationId: '1',
        });
        setEntries(result || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar entradas');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [token, txMonth, txYear]);

  const handleLink = async (entryId: number) => {
    if (!token) return;

    setLinkingId(entryId);
    try {
      await matchPlannedEntry(
        entryId,
        {
          transaction_id: transaction.transaction_id,
          month: txMonth,
          year: txYear,
        },
        { token, organizationId: '1' }
      );
      onLink();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular');
    } finally {
      setLinkingId(null);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numAmount);
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    // Filter by category
    if (filterCategory !== 'all' && entry.CategoryID !== filterCategory) {
      return false;
    }
    // Filter by search term
    if (searchTerm && !entry.Description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Only show pending entries (not already matched)
    if (entry.Status !== 'pending' && entry.Status !== 'missed') {
      return false;
    }
    return true;
  });

  // Sort entries - matching category first, then by description
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    // Entries matching transaction's category come first
    const aMatches = a.CategoryID === transaction.category_id;
    const bMatches = b.CategoryID === transaction.category_id;
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    return a.Description.localeCompare(b.Description);
  });

  const txCategory = transaction.category_id ? categories.get(transaction.category_id) : null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-[60]"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-gradient-to-r from-wheat-500 to-wheat-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🔗 Vincular a Entrada Planejada</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2 text-sm text-white/90">
            <span className="font-medium">Transação:</span>{' '}
            {transaction.description}
            {txCategory && (
              <>
                {' → '}
                <span className="inline-flex items-center gap-1">
                  {txCategory.icon} {txCategory.name}
                </span>
              </>
            )}
          </div>
          <div className="mt-1 text-sm text-white/80">
            <span className="tabular-nums">{formatCurrency(transaction.amount)}</span>
            {' • '}
            <span className="capitalize">
              {new Date(transaction.transaction_date).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-stone-100 flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Buscar entrada..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterCategory === 'all' ? 'all' : filterCategory}
            onChange={(e) => setFilterCategory(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-transparent"
          >
            <option value="all">Todas categorias</option>
            {Array.from(categories.values()).map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-3 bg-stone-50 rounded-lg">
                  <div className="flex-1">
                    <div className="h-4 bg-stone-200 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-stone-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-8 w-20 bg-stone-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-rust-600">{error}</p>
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-stone-500 mb-2">Nenhuma entrada planejada disponível</p>
              <p className="text-sm text-stone-400">
                {entries.length > 0
                  ? 'Todas as entradas já estão vinculadas ou foram filtradas'
                  : `Nenhuma entrada planejada para ${new Date(transaction.transaction_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map(entry => {
                const category = categories.get(entry.CategoryID);
                const isMatchingCategory = entry.CategoryID === transaction.category_id;

                return (
                  <div
                    key={entry.PlannedEntryID}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      isMatchingCategory
                        ? 'bg-wheat-50 border-wheat-200'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-900 truncate">
                          {entry.Description}
                        </span>
                        {isMatchingCategory && (
                          <span className="text-xs px-1.5 py-0.5 bg-wheat-200 text-wheat-700 rounded">
                            Mesma categoria
                          </span>
                        )}
                        {entry.Status === 'missed' && (
                          <span className="text-xs px-1.5 py-0.5 bg-rust-100 text-rust-700 rounded">
                            Atrasado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
                        <span className="inline-flex items-center gap-1">
                          {category?.icon} {category?.name}
                        </span>
                        <span className="tabular-nums">
                          {entry.AmountMin && entry.AmountMax && entry.AmountMin !== entry.AmountMax
                            ? `${formatCurrency(entry.AmountMin)} - ${formatCurrency(entry.AmountMax)}`
                            : formatCurrency(entry.Amount)}
                        </span>
                        {entry.IsRecurrent && (
                          <span className="text-xs px-1.5 py-0.5 bg-wheat-100 text-wheat-700 rounded">
                            Recorrente
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLink(entry.PlannedEntryID)}
                      disabled={linkingId !== null}
                      className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-wheat-500 to-wheat-600 text-white rounded-lg hover:from-wheat-600 hover:to-wheat-700 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      {linkingId === entry.PlannedEntryID ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          ...
                        </span>
                      ) : (
                        'Vincular'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
