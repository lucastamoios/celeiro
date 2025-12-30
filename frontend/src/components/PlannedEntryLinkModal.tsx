import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import type { PlannedEntry } from '../types/budget';
import type { Category } from '../types/category';
import type { ApiResponse } from '../types/transaction';

interface AdvancedPattern {
  pattern_id: number;
  target_description: string;
  target_category_id: number;
  description_pattern: string;
  amount_min?: string;
  amount_max?: string;
}

interface PlannedEntryLinkModalProps {
  pattern: AdvancedPattern;
  categories: Map<number, Category>;
  onClose: () => void;
  onLink: (entryId: number) => Promise<void>;
}

export default function PlannedEntryLinkModal({
  pattern,
  categories,
  onClose,
  onLink,
}: PlannedEntryLinkModalProps) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<PlannedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | 'all'>(pattern.target_category_id);
  const [linkingId, setLinkingId] = useState<number | null>(null);

  // Handle ESC key and backdrop click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Fetch planned entries
  useEffect(() => {
    const fetchEntries = async () => {
      if (!token) return;

      try {
        const response = await fetch(financialUrl('planned-entries'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch planned entries');
        }

        const result: ApiResponse<PlannedEntry[]> = await response.json();
        setEntries(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar entradas');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [token]);

  const handleLink = async (entryId: number) => {
    setLinkingId(entryId);
    try {
      await onLink(entryId);
    } finally {
      setLinkingId(null);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(amount));
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
    // Only show active entries
    if (!entry.IsActive) {
      return false;
    }
    // Don't show entries that already have a pattern linked
    if (entry.PatternID) {
      return false;
    }
    return true;
  });

  // Sort entries - matching category first, then by description
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    // Entries matching pattern's category come first
    const aMatches = a.CategoryID === pattern.target_category_id;
    const bMatches = b.CategoryID === pattern.target_category_id;
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    return a.Description.localeCompare(b.Description);
  });

  const targetCategory = categories.get(pattern.target_category_id);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🔗 Vincular Padrão a Entrada Planejada</h2>
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
            <span className="font-medium">Padrão:</span>{' '}
            <code className="bg-white/20 px-1.5 py-0.5 rounded">{pattern.description_pattern}</code>
            {' → '}
            <span className="inline-flex items-center gap-1">
              {targetCategory?.icon} {targetCategory?.name}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Buscar entrada..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterCategory === 'all' ? 'all' : filterCategory}
            onChange={(e) => setFilterCategory(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                <div key={i} className="animate-pulse flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">Nenhuma entrada planejada disponível</p>
              <p className="text-sm text-gray-400">
                {entries.length > 0
                  ? 'Todas as entradas já estão vinculadas ou foram filtradas'
                  : 'Crie uma entrada planejada primeiro'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map(entry => {
                const category = categories.get(entry.CategoryID);
                const isMatchingCategory = entry.CategoryID === pattern.target_category_id;

                return (
                  <div
                    key={entry.PlannedEntryID}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      isMatchingCategory
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {entry.Description}
                        </span>
                        {isMatchingCategory && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-200 text-purple-700 rounded">
                            Mesma categoria
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          {category?.icon} {category?.name}
                        </span>
                        <span>
                          {entry.AmountMin && entry.AmountMax && entry.AmountMin !== entry.AmountMax
                            ? `${formatCurrency(entry.AmountMin)} - ${formatCurrency(entry.AmountMax)}`
                            : formatCurrency(entry.Amount)}
                        </span>
                        {entry.IsRecurrent && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            Recorrente
                          </span>
                        )}
                        {entry.EntryType === 'income' && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                            Receita
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLink(entry.PlannedEntryID)}
                      disabled={linkingId !== null}
                      className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex-shrink-0"
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
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
