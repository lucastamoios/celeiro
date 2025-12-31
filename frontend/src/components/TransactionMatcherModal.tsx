import { useState, useMemo } from 'react';
import type { PlannedEntryWithStatus } from '../types/budget';
import type { Transaction } from '../types/transaction';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface TransactionMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (transactionId: number) => void;
  plannedEntry: PlannedEntryWithStatus;
  transactions: Transaction[];
  categories: Array<{ category_id: number; name: string }>;
  month: number;
  year: number;
  isLoading?: boolean;
}

export default function TransactionMatcherModal({
  isOpen,
  onClose,
  onSelect,
  plannedEntry,
  transactions,
  categories,
  month,
  year,
  isLoading = false,
}: TransactionMatcherModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Handle ESC key and click outside to close modal
  const { handleBackdropClick } = useModalDismiss(onClose);

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numAmount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getCategoryName = (categoryId: number | null): string => {
    if (!categoryId) return 'Sem categoria';
    const category = categories.find((c) => c.category_id === categoryId);
    return category ? category.name : 'Categoria desconhecida';
  };

  // Filter transactions for the selected month/year
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.transaction_date);
      return txDate.getMonth() + 1 === month && txDate.getFullYear() === year;
    });
  }, [transactions, month, year]);

  // Calculate similarity score between transaction and planned entry
  const calculateMatchScore = (tx: Transaction): number => {
    let score = 0;

    // Category match (highest weight)
    if (tx.category_id === plannedEntry.CategoryID) {
      score += 40;
    }

    // Amount similarity (within 20% range)
    const txAmount = Math.abs(parseFloat(tx.amount));
    const plannedAmount = parseFloat(plannedEntry.Amount);
    const amountDiff = Math.abs(txAmount - plannedAmount) / plannedAmount;
    if (amountDiff <= 0.05) score += 35; // Within 5%
    else if (amountDiff <= 0.1) score += 25; // Within 10%
    else if (amountDiff <= 0.2) score += 15; // Within 20%

    // Date range match (if expected days are set)
    if (plannedEntry.ExpectedDayStart && plannedEntry.ExpectedDayEnd) {
      const txDay = new Date(tx.transaction_date).getDate();
      if (txDay >= plannedEntry.ExpectedDayStart && txDay <= plannedEntry.ExpectedDayEnd) {
        score += 25;
      }
    } else if (plannedEntry.ExpectedDay) {
      const txDay = new Date(tx.transaction_date).getDate();
      if (Math.abs(txDay - plannedEntry.ExpectedDay) <= 3) {
        score += 25;
      }
    }

    return score;
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = monthTransactions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.description.toLowerCase().includes(query) ||
          tx.original_description?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter === 'entry') {
      // Filter by planned entry's category
      filtered = filtered.filter((tx) => tx.category_id === plannedEntry.CategoryID);
    } else if (categoryFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.category_id === parseInt(categoryFilter));
    }

    // Calculate scores and sort by match score (highest first)
    return filtered
      .map((tx) => ({
        ...tx,
        matchScore: calculateMatchScore(tx),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [monthTransactions, searchQuery, categoryFilter, plannedEntry]);

  const getMatchScoreColor = (score: number): string => {
    if (score >= 70) return 'text-sage-600 bg-sage-100';
    if (score >= 40) return 'text-terra-600 bg-terra-100';
    return 'text-stone-600 bg-stone-100';
  };

  const getMatchScoreLabel = (score: number): string => {
    if (score >= 70) return 'Alta';
    if (score >= 40) return 'Média';
    return 'Baixa';
  };

  if (!isOpen) return null;

  const monthName = new Date(year, month - 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-stone-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">
                Vincular Transação
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Selecione uma transação para vincular a "{plannedEntry.Description}"
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm text-stone-500">
                <span>📅 {monthName}</span>
                <span>•</span>
                <span>💰 {formatCurrency(plannedEntry.Amount)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              aria-label="Fechar"
            >
              <svg
                className="w-5 h-5 text-stone-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar transação..."
                className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 text-sm"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 text-sm"
            >
              <option value="entry">
                {getCategoryName(plannedEntry.CategoryID)} (Sugerida)
              </option>
              <option value="all">Todas as categorias</option>
              {showAllCategories &&
                categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="px-3 py-2 text-sm text-wheat-600 hover:bg-wheat-50 rounded-lg transition-colors"
            >
              {showAllCategories ? 'Menos' : 'Mais'}
            </button>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-stone-50 rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-stone-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-stone-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-stone-600">Nenhuma transação encontrada</p>
              <p className="text-sm text-stone-500 mt-1">
                Tente ajustar os filtros ou buscar por outro termo
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.transaction_id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-stone-50 ${
                    tx.matchScore >= 70
                      ? 'border-sage-200 bg-sage-50/50'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-500">
                        {formatDate(tx.transaction_date)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getMatchScoreColor(
                          tx.matchScore
                        )}`}
                      >
                        {getMatchScoreLabel(tx.matchScore)}
                      </span>
                      {tx.category_id === plannedEntry.CategoryID && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-wheat-100 text-wheat-700">
                          Mesma categoria
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-stone-900 truncate mt-1">
                      {tx.description}
                    </p>
                    <p className="text-sm text-stone-500 mt-0.5">
                      {getCategoryName(tx.category_id)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          tx.transaction_type === 'credit'
                            ? 'text-sage-600'
                            : 'text-stone-900'
                        }`}
                      >
                        {tx.transaction_type === 'credit' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => onSelect(tx.transaction_id)}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-wheat-500 to-wheat-600 rounded-lg hover:from-wheat-600 hover:to-wheat-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      Vincular
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-600">
              {filteredTransactions.length} transação(ões) encontrada(s)
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
