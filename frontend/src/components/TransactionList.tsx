import { useEffect, useState, Fragment } from 'react';
import type { Transaction, ApiResponse } from '../types/transaction';
import type { Category } from '../types/category';
import { useAuth } from '../contexts/AuthContext';
import { apiUrl, financialUrl } from '../config/api';
// Simple patterns have been removed - unified pattern system now in PatternManager

interface Account {
  // Backend returns PascalCase for accounts (no json tags)
  AccountID: number;
  Name: string;
  BankName: string;
  AccountType: string;
  Currency: string;
  IsActive: boolean;
}

interface SessionMeResponse {
  user: { id: number; email: string; name: string };
  organizations: { organization_id: number; name: string }[];
}

export default function TransactionList() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Map<number, Category>>(new Map());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string>('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<{id: number; field: 'description' | 'category'} | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [token, selectedAccountId]);

  const fetchData = async () => {
    if (!token) return;

    try {
      // Determine active org from session (avoids hardcoding org=1)
      const meRes = await fetch(apiUrl('/accounts/me/'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!meRes.ok) {
        throw new Error('Failed to fetch session info');
      }
      const meJson: ApiResponse<SessionMeResponse> = await meRes.json();
      const orgId = meJson.data?.organizations?.[0]?.organization_id?.toString() || '1';
      setActiveOrganizationId(orgId);

      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Active-Organization': orgId,
      };

      // Fetch categories + accounts (need accountId before fetching transactions)
      const [categoriesRes, accountsRes] = await Promise.all([
        fetch(financialUrl('categories'), { headers }),
        fetch(financialUrl('accounts'), { headers }),
      ]);

      if (!categoriesRes.ok || !accountsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const categoriesData: ApiResponse<Category[]> = await categoriesRes.json();
      const accountsData: ApiResponse<Account[]> = await accountsRes.json();
      const fetchedAccounts = accountsData.data || [];
      setAccounts(fetchedAccounts);

      const accountId = selectedAccountId ?? fetchedAccounts?.[0]?.AccountID ?? null;
      if (!accountId) {
        setTransactions([]);
        setError('Nenhuma conta encontrada. Crie uma conta antes de importar OFX.');
        return;
      }
      if (selectedAccountId !== accountId) {
        setSelectedAccountId(accountId);
      }

      const transactionsRes = await fetch(
        `${financialUrl('accounts')}/${accountId}/transactions?limit=50`,
        { headers }
      );
      if (!transactionsRes.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const transactionsData: ApiResponse<Transaction[]> = await transactionsRes.json();

      // Create a map of categoryID -> Category for quick lookup
      const categoryMap = new Map<number, Category>();
      (categoriesData.data || []).forEach(cat => categoryMap.set(cat.category_id, cat));

      setCategories(categoryMap);
      setTransactions(transactionsData.data || []);

      // Simple patterns have been removed - pattern matching now happens via unified pattern system
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
    if (!selectedAccountId) {
      setError('Selecione uma conta antes de importar OFX.');
      setUploading(false);
      event.target.value = '';
      return;
    }

    try {
      const response = await fetch(
        `${financialUrl('accounts')}/${selectedAccountId}/transactions/import`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': activeOrganizationId,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const maybeJson = await response.json().catch(() => null);
        const msg = maybeJson?.message || 'Failed to upload OFX file';
        const code = maybeJson?.code ? ` (${maybeJson.code})` : '';
        throw new Error(`${msg}${code}`);
      }

      const result = await response.json();
      const imported =
        result?.data?.ImportedCount ??
        result?.data?.imported_count ??
        result?.data?.importedCount ??
        'unknown';
      const duplicates =
        result?.data?.DuplicateCount ??
        result?.data?.duplicate_count ??
        result?.data?.duplicateCount ??
        0;
      setUploadSuccess(`✅ Imported ${imported} transactions (duplicates: ${duplicates}).`);

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

  // Simple pattern functions removed - pattern system now unified in PatternManager

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

    const newIgnoredState = !transaction.is_ignored;

    try {
      await handleUpdateTransaction(transaction.transaction_id, { is_ignored: newIgnoredState });
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
            {accounts.length > 0 && (
              <select
                value={selectedAccountId ?? ''}
                onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Selecionar conta"
              >
                {accounts.map((acc) => (
                  <option key={acc.AccountID} value={acc.AccountID}>
                    {acc.Name} ({acc.BankName})
                  </option>
                ))}
              </select>
            )}
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
                  <Fragment key={transaction.transaction_id}>
                    <tr className={`hover:bg-gray-50 ${transaction.is_ignored ? 'opacity-40 bg-gray-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.transaction_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        {editingTransaction?.id === transaction.transaction_id && editingTransaction?.field === 'description' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editedDescription}
                              onChange={(e) => setEditedDescription(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveDescription(transaction.transaction_id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              onBlur={() => handleSaveDescription(transaction.transaction_id)}
                              autoFocus
                              className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ) : (
                          <div
                            className={`truncate cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2 ${transaction.is_ignored ? 'line-through' : ''}`}
                            title={transaction.description}
                            onClick={() => handleStartEdit(transaction.transaction_id, 'description', transaction.description)}
                          >
                            {transaction.description}
                            {transaction.is_ignored && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">IGNORADA</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.transaction_type === 'credit'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.transaction_type === 'credit' ? 'Crédito' : 'Débito'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingTransaction?.id === transaction.transaction_id && editingTransaction?.field === 'category' ? (
                          <select
                            value={transaction.category_id || ''}
                            onChange={(e) => {
                              const categoryId = parseInt(e.target.value);
                              if (categoryId) {
                                handleCategoryChange(transaction.transaction_id, categoryId);
                              }
                            }}
                            onBlur={() => handleCancelEdit()}
                            autoFocus
                            className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="">Selecione uma categoria</option>
                            {Array.from(categories.values()).map(cat => (
                              <option key={cat.category_id} value={cat.category_id}>
                                {cat.icon} {cat.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div
                            className="cursor-pointer hover:opacity-70 transition-opacity"
                            onClick={() => handleStartEdit(transaction.transaction_id, 'category', transaction.description)}
                          >
                            {transaction.category_id && categories.has(transaction.category_id) ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                <span>{categories.get(transaction.category_id)!.icon}</span>
                                <span>{categories.get(transaction.category_id)!.name}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Não classificada</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={transaction.notes || ''}>
                        {transaction.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">

                          {/* Three-dot menu */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === transaction.transaction_id ? null : transaction.transaction_id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                              title="Mais ações"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {openMenuId === transaction.transaction_id && (
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
                                      <span>{transaction.is_ignored ? '👁️' : '👁️‍🗨️'}</span>
                                      <span>{transaction.is_ignored ? 'Não ignorar' : 'Ignorar transação'}</span>
                                    </button>
                                    <button
                                      onClick={() => handleDelete(transaction.transaction_id)}
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
