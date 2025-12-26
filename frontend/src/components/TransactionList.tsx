import { useEffect, useState, Fragment } from 'react';
import type { Transaction, ApiResponse } from '../types/transaction';
import type { Category } from '../types/category';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import { saveTransactionAsPattern, getMatchSuggestions, applyPatternToTransaction, getSavedPatterns } from '../api/budget';

interface MatchSuggestion {
  pattern: {
    planned_entry_id: number;
    description: string;
    category_id: number;
    amount: string;
  };
  match_score: {
    total_score: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    description_similarity: number;
    amount_similarity: number;
    day_alignment: number;
    weekday_alignment?: number;
  };
}

export default function TransactionList() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Map<number, Category>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [savingPattern, setSavingPattern] = useState<number | null>(null); // Track which transaction is being saved
  const [expandedTransaction, setExpandedTransaction] = useState<number | null>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<Map<number, MatchSuggestion[]>>(new Map());
  const [loadingSuggestions, setLoadingSuggestions] = useState<number | null>(null);
  const [applyingPattern, setApplyingPattern] = useState<{ transactionId: number; patternId: number } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<{id: number; field: 'description' | 'category'} | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [savedPatternIds, setSavedPatternIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Active-Organization': '1'
    };

    try {
      // Fetch categories and transactions
      const [categoriesRes, transactionsRes] = await Promise.all([
        fetch(financialUrl('categories'), { headers }),
        fetch(`${financialUrl('accounts')}/1/transactions?limit=50`, { headers })
      ]);

      if (!categoriesRes.ok || !transactionsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const categoriesData: ApiResponse<Category[]> = await categoriesRes.json();
      const transactionsData: ApiResponse<Transaction[]> = await transactionsRes.json();

      // Create a map of categoryID -> Category for quick lookup
      const categoryMap = new Map<number, Category>();
      (categoriesData.data || []).forEach(cat => categoryMap.set(cat.CategoryID, cat));

      setCategories(categoryMap);
      setTransactions(transactionsData.data || []);

      // Try to fetch saved patterns (non-blocking - graceful degradation)
      try {
        const patterns = await getSavedPatterns(undefined, { token });

        // Match saved patterns to transactions
        // A transaction has a saved pattern if there's a pattern with matching description and category
        const patternMatches = new Set<number>();
        (transactionsData.data || []).forEach(tx => {
          if (tx.CategoryID && patterns) {
            const hasPattern = patterns.some(pattern =>
              pattern.Description === tx.Description &&
              pattern.CategoryID === tx.CategoryID
            );
            if (hasPattern) {
              patternMatches.add(tx.TransactionID);
            }
          }
        });

        setSavedPatternIds(patternMatches);
      } catch (patternErr) {
        // Pattern loading failed - not critical, just log it
        console.warn('Failed to load saved patterns:', patternErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    setError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('ofx_file', file);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Active-Organization': '1',
    };

    try {
      const response = await fetch(
        financialUrl('accounts') + '/1/transactions/import',
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload OFX file');
      }

      const result = await response.json();
      setUploadSuccess(`✅ Imported ${result.data.imported_count} transactions successfully!`);

      // Refresh the transaction list
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload OFX file');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleSaveAsPattern = async (transaction: Transaction) => {
    if (!token || !transaction.CategoryID) return;

    setSavingPattern(transaction.TransactionID);
    setError(null);

    try {
      await saveTransactionAsPattern(
        transaction.TransactionID,
        {
          is_recurrent: false, // Could be made configurable
          expected_day: new Date(transaction.TransactionDate).getDate(),
        },
        { token }
      );

      setUploadSuccess(`✅ Padrão salvo! Veja na aba "Padrões"`);
      setTimeout(() => setUploadSuccess(null), 5000);

      // Mark this transaction as having a saved pattern
      setSavedPatternIds(prev => new Set(prev).add(transaction.TransactionID));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar padrão');
    } finally {
      setSavingPattern(null);
    }
  };

  const handleToggleSuggestions = async (transaction: Transaction) => {
    if (expandedTransaction === transaction.TransactionID) {
      setExpandedTransaction(null);
      return;
    }

    setExpandedTransaction(transaction.TransactionID);

    // If we already have suggestions cached, don't fetch again
    if (matchSuggestions.has(transaction.TransactionID)) {
      return;
    }

    // Fetch match suggestions
    if (!token) return;

    setLoadingSuggestions(transaction.TransactionID);
    setError(null);

    try {
      const suggestions = await getMatchSuggestions(
        transaction.TransactionID,
        undefined, // No category filter
        { token }
      );

      setMatchSuggestions(prev => new Map(prev).set(transaction.TransactionID, suggestions || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao buscar sugestões');
    } finally {
      setLoadingSuggestions(null);
    }
  };

  const handleApplyPattern = async (transactionId: number, patternId: number) => {
    if (!token) return;

    setApplyingPattern({ transactionId, patternId });
    setError(null);

    try {
      await applyPatternToTransaction(transactionId, patternId, { token });

      setUploadSuccess(`✅ Padrão aplicado com sucesso!`);
      setTimeout(() => setUploadSuccess(null), 3000);

      // Refresh transactions to show updated category
      await fetchData();

      // Clear suggestions cache for this transaction
      setMatchSuggestions(prev => {
        const newMap = new Map(prev);
        newMap.delete(transactionId);
        return newMap;
      });

      // Collapse the expanded transaction
      setExpandedTransaction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar padrão');
    } finally {
      setApplyingPattern(null);
    }
  };

  const handleUpdateTransaction = async (transactionId: number, updates: { description?: string; category_id?: number; is_ignored?: boolean }) => {
    if (!token) return;

    setError(null);

    try {
      const response = await fetch(
        `${financialUrl('accounts')}/1/transactions/${transactionId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      setUploadSuccess(`✅ Transação atualizada com sucesso!`);
      setTimeout(() => setUploadSuccess(null), 3000);

      // Refresh transactions
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setEditingTransaction(null);
    }
  };

  const handleStartEdit = (transactionId: number, field: 'description' | 'category', currentDescription: string) => {
    setEditingTransaction({ id: transactionId, field });
    if (field === 'description') {
      setEditedDescription(currentDescription);
    }
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditedDescription('');
  };

  const handleSaveDescription = (transactionId: number) => {
    if (editedDescription.trim()) {
      handleUpdateTransaction(transactionId, { description: editedDescription });
    }
  };

  const handleCategoryChange = (transactionId: number, categoryId: number) => {
    handleUpdateTransaction(transactionId, { category_id: categoryId });
  };

  const handleToggleIgnore = async (transaction: Transaction) => {
    if (!token) return;

    const newIgnoredState = !transaction.IsIgnored;

    try {
      await handleUpdateTransaction(transaction.TransactionID, { is_ignored: newIgnoredState });
      setOpenMenuId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle ignore');
    }
  };

  const handleDelete = async (transactionId: number) => {
    if (!token || !confirm('Tem certeza que deseja deletar esta transação?')) return;

    setError(null);

    try {
      const response = await fetch(
        `${financialUrl('accounts')}/1/transactions/${transactionId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      setUploadSuccess(`✅ Transação deletada com sucesso!`);
      setTimeout(() => setUploadSuccess(null), 3000);

      // Refresh transactions
      await fetchData();
      setOpenMenuId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-9 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
          </div>

          {/* Table skeleton */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4">
              <table className="min-w-full">
                <thead>
                  <tr>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <th key={i} className="px-6 py-3">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Erro ao carregar transações</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transações</h1>
            <p className="text-gray-600 mt-2">
              {(transactions?.length ?? 0)} transação{(transactions?.length ?? 0) !== 1 ? 'ões' : ''} encontrada{(transactions?.length ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <label className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              {uploading ? 'Importando...' : '📤 Importar OFX'}
              <input
                type="file"
                accept=".ofx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {uploadSuccess && (
              <p className="text-sm text-green-600 font-medium">{uploadSuccess}</p>
            )}

            {error && !uploading && (
              <p className="text-sm text-red-600 font-medium">❌ {error}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <Fragment key={transaction.TransactionID}>
                    <tr className={`hover:bg-gray-50 ${transaction.IsIgnored ? 'opacity-40 bg-gray-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.TransactionDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        {editingTransaction?.id === transaction.TransactionID && editingTransaction?.field === 'description' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editedDescription}
                              onChange={(e) => setEditedDescription(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveDescription(transaction.TransactionID);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              onBlur={() => handleSaveDescription(transaction.TransactionID)}
                              autoFocus
                              className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ) : (
                          <div
                            className={`truncate cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2 ${transaction.IsIgnored ? 'line-through' : ''}`}
                            title={transaction.Description}
                            onClick={() => handleStartEdit(transaction.TransactionID, 'description', transaction.Description)}
                          >
                            {transaction.Description}
                            {transaction.IsIgnored && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">IGNORADA</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.TransactionType === 'credit'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.TransactionType === 'credit' ? 'Crédito' : 'Débito'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        transaction.TransactionType === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.TransactionType === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.Amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingTransaction?.id === transaction.TransactionID && editingTransaction?.field === 'category' ? (
                          <select
                            value={transaction.CategoryID || ''}
                            onChange={(e) => {
                              const categoryId = parseInt(e.target.value);
                              if (categoryId) {
                                handleCategoryChange(transaction.TransactionID, categoryId);
                              }
                            }}
                            onBlur={() => handleCancelEdit()}
                            autoFocus
                            className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="">Selecione uma categoria</option>
                            {Array.from(categories.values()).map(cat => (
                              <option key={cat.CategoryID} value={cat.CategoryID}>
                                {cat.Icon} {cat.Name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div
                            className="cursor-pointer hover:opacity-70 transition-opacity"
                            onClick={() => handleStartEdit(transaction.TransactionID, 'category', transaction.Description)}
                          >
                            {transaction.CategoryID && categories.has(transaction.CategoryID) ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                <span>{categories.get(transaction.CategoryID)!.Icon}</span>
                                <span>{categories.get(transaction.CategoryID)!.Name}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Não classificada</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={transaction.Notes || ''}>
                        {transaction.Notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {transaction.CategoryID ? (
                            savedPatternIds.has(transaction.TransactionID) ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-green-500 text-xs font-medium rounded-md text-green-700 bg-green-50 cursor-default transition-colors"
                                title="Padrão já salvo! Veja na aba Padrões"
                              >
                                ✅ Padrão Salvo
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSaveAsPattern(transaction)}
                                disabled={savingPattern === transaction.TransactionID}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-indigo-600 text-xs font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Salvar como padrão para futuras transações similares"
                              >
                                {savingPattern === transaction.TransactionID ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    💾 Salvar Padrão
                                  </>
                                )}
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => handleToggleSuggestions(transaction)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-600 text-xs font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                              title="Buscar padrões correspondentes"
                            >
                              {expandedTransaction === transaction.TransactionID ? '🔼 Ocultar' : '🔍 Sugestões'}
                            </button>
                          )}

                          {/* Three-dot menu */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === transaction.TransactionID ? null : transaction.TransactionID)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                              title="Mais ações"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {openMenuId === transaction.TransactionID && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleToggleIgnore(transaction)}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                                    >
                                      <span>{transaction.IsIgnored ? '👁️' : '👁️‍🗨️'}</span>
                                      <span>{transaction.IsIgnored ? 'Não ignorar' : 'Ignorar transação'}</span>
                                    </button>
                                    <button
                                      onClick={() => handleDelete(transaction.TransactionID)}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                    >
                                      <span>🗑️</span>
                                      <span>Deletar transação</span>
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable suggestions row */}
                    {expandedTransaction === transaction.TransactionID && !transaction.CategoryID && (
                      <tr key={`${transaction.TransactionID}-suggestions`} className="bg-blue-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                              <span>💡</span>
                              <span>Sugestões de Padrões</span>
                            </div>

                            {loadingSuggestions === transaction.TransactionID ? (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Buscando padrões correspondentes...
                              </div>
                            ) : matchSuggestions.get(transaction.TransactionID)?.length === 0 ? (
                              <div className="text-sm text-gray-600 bg-white rounded-lg p-4 border border-blue-200">
                                Nenhum padrão correspondente encontrado. Categorize manualmente e salve como padrão para futuras transações similares.
                              </div>
                            ) : (
                              <div className="grid gap-3">
                                {matchSuggestions.get(transaction.TransactionID)?.map((suggestion, idx) => {
                                  const confidenceColors = {
                                    HIGH: 'bg-green-100 text-green-800 border-green-300',
                                    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                                    LOW: 'bg-gray-100 text-gray-800 border-gray-300',
                                  };

                                  return (
                                    <div
                                      key={`${suggestion.pattern.planned_entry_id}-${idx}`}
                                      className="bg-white rounded-lg border-2 border-blue-200 p-4 hover:border-blue-400 transition-colors"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{suggestion.pattern.description}</span>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${confidenceColors[suggestion.match_score.confidence]}`}>
                                              {suggestion.match_score.confidence === 'HIGH' ? '✨ Alta confiança' :
                                               suggestion.match_score.confidence === 'MEDIUM' ? '⚡ Média confiança' :
                                               '💭 Baixa confiança'}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-4 text-xs text-gray-600">
                                            {categories.has(suggestion.pattern.category_id) && (
                                              <span className="inline-flex items-center gap-1">
                                                <span>{categories.get(suggestion.pattern.category_id)!.Icon}</span>
                                                <span>{categories.get(suggestion.pattern.category_id)!.Name}</span>
                                              </span>
                                            )}
                                            <span>Valor: {formatCurrency(suggestion.pattern.amount)}</span>
                                            <span>Score: {(suggestion.match_score.total_score * 100).toFixed(0)}%</span>
                                          </div>

                                          <div className="text-xs text-gray-500 space-y-1">
                                            <div className="flex gap-4">
                                              <span>📝 Similaridade descrição: {(suggestion.match_score.description_similarity * 100).toFixed(0)}%</span>
                                              <span>💰 Similaridade valor: {(suggestion.match_score.amount_similarity * 100).toFixed(0)}%</span>
                                              {suggestion.match_score.day_alignment > 0 && (
                                                <span>📅 Dia do mês: {(suggestion.match_score.day_alignment * 100).toFixed(0)}%</span>
                                              )}
                                              {suggestion.match_score.weekday_alignment && suggestion.match_score.weekday_alignment > 0 && (
                                                <span>🗓️ Dia da semana: {(suggestion.match_score.weekday_alignment * 100).toFixed(0)}%</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => handleApplyPattern(transaction.TransactionID, suggestion.pattern.planned_entry_id)}
                                          disabled={applyingPattern?.transactionId === transaction.TransactionID && applyingPattern?.patternId === suggestion.pattern.planned_entry_id}
                                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                          {applyingPattern?.transactionId === transaction.TransactionID && applyingPattern?.patternId === suggestion.pattern.planned_entry_id ? (
                                            <span className="flex items-center gap-1.5">
                                              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              Aplicando...
                                            </span>
                                          ) : (
                                            '✓ Aplicar'
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
