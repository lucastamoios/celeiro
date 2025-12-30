import { useEffect, useState } from 'react';
import type { Transaction, ApiResponse } from '../types/transaction';
import type { Category } from '../types/category';
import { useAuth } from '../contexts/AuthContext';
import { apiUrl, financialUrl } from '../config/api';
import TransactionEditModal from './TransactionEditModal';
import TransactionCreateModal from './TransactionCreateModal';
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
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string>('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        `${financialUrl('accounts')}/${accountId}/transactions`,
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

  const handleOpenEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleCloseEditModal = () => {
    setEditingTransaction(null);
  };

  const handleSaveTransaction = async () => {
    setUploadSuccess(`✅ Transação atualizada com sucesso!`);
    setTimeout(() => setUploadSuccess(null), 3000);
    await fetchData();
  };

  const handleCreateTransaction = async () => {
    setUploadSuccess(`✅ Transação criada com sucesso!`);
    setTimeout(() => setUploadSuccess(null), 3000);
    await fetchData();
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

  // Filter transactions by current month
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  
  const currentMonthTransactions = transactions.filter(t => {
    const txDate = new Date(t.transaction_date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });

  // Calculate totals for current month
  const totalIncome = currentMonthTransactions
    .filter(t => !t.is_ignored && t.transaction_type === 'credit')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const totalExpense = currentMonthTransactions
    .filter(t => !t.is_ignored && t.transaction_type === 'debit')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transações</h1>
            <p className="text-gray-600 mt-2">
              {(currentMonthTransactions?.length ?? 0)} transação{(currentMonthTransactions?.length ?? 0) !== 1 ? 'ões' : ''} em {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                ➕ Nova Transação
              </button>
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
            </div>

            {uploadSuccess && (
              <p className="text-sm text-green-600 font-medium">{uploadSuccess}</p>
            )}

            {error && !uploading && (
              <p className="text-sm text-red-600 font-medium">❌ {error}</p>
            )}
          </div>
        </div>

        {/* Discrete totals board */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Receitas</div>
            <div className="text-xl font-semibold text-green-600">{formatCurrency(totalIncome.toString())}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Despesas</div>
            <div className="text-xl font-semibold text-red-600">{formatCurrency(totalExpense.toString())}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Saldo</div>
            <div className={`text-xl font-semibold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatCurrency(balance.toString())}
            </div>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentMonthTransactions.map((transaction) => (
                    <tr
                      key={transaction.transaction_id}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${transaction.is_ignored ? 'opacity-40 bg-gray-50' : ''}`}
                      onClick={() => handleOpenEditModal(transaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.transaction_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        <div className={`truncate flex items-center gap-2 ${transaction.is_ignored ? 'line-through' : ''}`}>
                          {transaction.description}
                          {transaction.is_ignored && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">IGNORADA</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.category_id && categories.has(transaction.category_id) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            <span>{categories.get(transaction.category_id)!.icon}</span>
                            <span>{categories.get(transaction.category_id)!.name}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Não classificada</span>
                        )}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          categories={categories}
          onClose={handleCloseEditModal}
          onSave={handleSaveTransaction}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && selectedAccountId && (
        <TransactionCreateModal
          accountId={selectedAccountId}
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateTransaction}
        />
      )}
    </div>
  );
}
