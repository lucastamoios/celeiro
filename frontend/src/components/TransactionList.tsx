import { useEffect, useState } from 'react';
import { Coins, XCircle, Filter } from 'lucide-react';
import type { Transaction, ApiResponse } from '../types/transaction';
import type { Category } from '../types/category';
import { useAuth } from '../contexts/AuthContext';
import { apiUrl, financialUrl } from '../config/api';
import { usePersistedFilters } from '../hooks/usePersistedState';
import { useSelectedMonth } from '../hooks/useSelectedMonth';
import TransactionEditModal from './TransactionEditModal';
import TransactionCreateModal from './TransactionCreateModal';
// Simple patterns have been removed - unified pattern system now in PatternManager

// Default filter values (month is now handled by useSelectedMonth hook)
const DEFAULT_TRANSACTION_FILTERS = {
  hideIgnored: false,
  onlyUncategorized: false,
  onlyOriginalDescription: false,
};

// Month names for display
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

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

  // Filters (persisted to localStorage) - month is handled separately by useSelectedMonth
  const { filters, setFilter } = usePersistedFilters(
    'celeiro:transaction-filters',
    DEFAULT_TRANSACTION_FILTERS
  );
  const { hideIgnored, onlyUncategorized, onlyOriginalDescription } = filters;

  // Shared month selection (synced across pages)
  const {
    selectedMonth,
    selectedYear,
    goToPreviousMonth: handlePreviousMonth,
    goToNextMonth: handleNextMonth,
    goToCurrentMonth: handleGoToCurrentMonth,
    isCurrentMonth,
  } = useSelectedMonth();

  const getMonthName = (month: number) => monthNames[month - 1];

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
      <div className="min-h-screen bg-stone-50 p-4 md:p-8 animate-pulse">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-9 bg-stone-200 rounded w-1/4 mb-2"></div>
            <div className="h-6 bg-stone-200 rounded w-1/6"></div>
          </div>

          {/* Table skeleton */}
          <div className="card">
            <div className="p-4">
              <table className="min-w-full">
                <thead>
                  <tr>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <th key={i} className="px-6 py-3">
                        <div className="h-4 bg-stone-200 rounded w-20"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-stone-200 rounded"></div>
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
      <div className="min-h-screen bg-stone-50 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-rust-50 border border-rust-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-rust-900 mb-2">Erro ao carregar transações</h3>
          <p className="text-rust-700 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="btn-danger"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Filter transactions by selected month
  const selectedMonthTransactions = transactions.filter(t => {
    const txDate = new Date(t.transaction_date);
    // selectedMonth is 1-12, getMonth() is 0-11
    return txDate.getMonth() + 1 === selectedMonth && txDate.getFullYear() === selectedYear;
  });

  // Apply visual filters for display
  const filteredTransactions = selectedMonthTransactions.filter(t => {
    // Filter: hide ignored transactions
    if (hideIgnored && t.is_ignored) return false;
    // Filter: only uncategorized transactions (category_id can be null, undefined, or 0)
    if (onlyUncategorized && t.category_id) return false;
    // Filter: only transactions with original description (not renamed)
    if (onlyOriginalDescription && t.description !== t.original_description) return false;
    return true;
  });

  // Calculate totals for selected month (always based on full list, not filtered)
  const totalIncome = selectedMonthTransactions
    .filter(t => !t.is_ignored && t.transaction_type === 'credit')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpense = selectedMonthTransactions
    .filter(t => !t.is_ignored && t.transaction_type === 'debit')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Month Navigation */}
        <div className="mb-6 card-compact">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4">
              <button
                onClick={handlePreviousMonth}
                className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                title="Mês anterior"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="text-center min-w-[140px] sm:min-w-[180px]">
                <h1 className="text-lg sm:text-xl font-bold text-stone-900">
                  {getMonthName(selectedMonth)} {selectedYear}
                </h1>
                <p className="text-xs text-stone-500">
                  {filteredTransactions.length === selectedMonthTransactions.length ? (
                    <>{selectedMonthTransactions.length} {selectedMonthTransactions.length === 1 ? 'transação' : 'transações'}</>
                  ) : (
                    <>{filteredTransactions.length} de {selectedMonthTransactions.length}</>
                  )}
                  {isCurrentMonth && <span className="ml-1 text-wheat-600 font-medium">• Mês atual</span>}
                </p>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                title="Próximo mês"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {!isCurrentMonth && (
                <button
                  onClick={handleGoToCurrentMonth}
                  className="ml-1 sm:ml-2 px-2 sm:px-3 py-1 text-sm text-wheat-600 hover:text-wheat-800 hover:bg-wheat-50 rounded-lg transition-colors"
                >
                  Hoje
                </button>
              )}
            </div>

            {/* Action Buttons - moved here for better layout */}
            <div className="flex gap-2 justify-center sm:justify-end">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Transação
              </button>
              <label className="btn-secondary text-sm cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploading ? 'Importando...' : 'Importar OFX'}
                <input
                  type="file"
                  accept=".ofx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">Filtros</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={onlyUncategorized}
                onChange={(e) => setFilter('onlyUncategorized', e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-wheat-600 focus:ring-wheat-500"
              />
              <span className="text-sm text-stone-600 group-hover:text-stone-900">Sem categoria</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={hideIgnored}
                onChange={(e) => setFilter('hideIgnored', e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-wheat-600 focus:ring-wheat-500"
              />
              <span className="text-sm text-stone-600 group-hover:text-stone-900">Ocultar ignoradas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={onlyOriginalDescription}
                onChange={(e) => setFilter('onlyOriginalDescription', e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-wheat-600 focus:ring-wheat-500"
              />
              <span className="text-sm text-stone-600 group-hover:text-stone-900">Com descrição original</span>
            </label>
          </div>
        </div>

        {/* Success/Error Messages */}
        {uploadSuccess && (
          <div className="mb-4 p-3 bg-sage-50 border border-sage-200 text-sage-700 rounded-lg text-sm">
            {uploadSuccess}
          </div>
        )}
        {error && !uploading && (
          <div className="mb-4 p-3 bg-rust-50 border border-rust-200 text-rust-700 rounded-lg text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="card-compact flex items-center gap-3 sm:block">
            <div className="w-10 h-10 sm:w-auto sm:h-auto bg-sage-100 rounded-lg flex items-center justify-center sm:hidden">
              <Coins className="w-5 h-5 text-sage-600" />
            </div>
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wide mb-0.5 sm:mb-1">Receitas</div>
              <div className="text-lg sm:text-xl font-semibold text-sage-600 tabular-nums">{formatCurrency(totalIncome.toString())}</div>
            </div>
          </div>
          <div className="card-compact flex items-center gap-3 sm:block">
            <div className="w-10 h-10 sm:w-auto sm:h-auto bg-rust-100 rounded-lg flex items-center justify-center sm:hidden">
              <span className="text-lg">💸</span>
            </div>
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wide mb-0.5 sm:mb-1">Despesas</div>
              <div className="text-lg sm:text-xl font-semibold text-rust-600 tabular-nums">{formatCurrency(totalExpense.toString())}</div>
            </div>
          </div>
          <div className="card-compact flex items-center gap-3 sm:block">
            <div className={`w-10 h-10 sm:w-auto sm:h-auto rounded-lg flex items-center justify-center sm:hidden ${balance >= 0 ? 'bg-sage-100' : 'bg-rust-100'}`}>
              <span className="text-lg">{balance >= 0 ? '📈' : '📉'}</span>
            </div>
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wide mb-0.5 sm:mb-1">Saldo</div>
              <div className={`text-lg sm:text-xl font-semibold tabular-nums ${balance >= 0 ? 'text-sage-600' : 'text-rust-600'}`}>
                {formatCurrency(balance.toString())}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.transaction_id}
              onClick={() => handleOpenEditModal(transaction)}
              className={`bg-white border border-stone-200 rounded-xl p-4 cursor-pointer
                transition-all duration-150 ease-out
                active:scale-[0.98] active:bg-stone-50 active:shadow-inner active:border-stone-300
                ${transaction.is_ignored ? 'opacity-50' : 'shadow-sm'}`}
            >
              {/* First line: Description */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className={`text-sm font-medium text-stone-900 line-clamp-2 flex-1 ${
                  transaction.is_ignored ? 'line-through' : ''
                }`}>
                  {transaction.description}
                </p>
                <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
                  transaction.transaction_type === 'credit' ? 'text-sage-600' : 'text-rust-600'
                }`}>
                  {transaction.transaction_type === 'credit' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>

              {/* Second line: Date + Category + Ignored badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-stone-500 tabular-nums">
                  {formatDate(transaction.transaction_date)}
                </span>
                <span className="text-stone-300">•</span>
                {transaction.category_id && categories.has(transaction.category_id) ? (
                  <span className="inline-flex items-center gap-1 text-xs text-stone-600">
                    <span>{categories.get(transaction.category_id)!.icon}</span>
                    <span>{categories.get(transaction.category_id)!.name}</span>
                  </span>
                ) : (
                  <span className="text-xs text-stone-400 italic">Sem categoria</span>
                )}
                {transaction.is_ignored && (
                  <span className="text-xs bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-medium">
                    IGNORADA
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Categoria
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.transaction_id}
                      className={`hover:bg-wheat-50 cursor-pointer transition-colors ${transaction.is_ignored ? 'opacity-40 bg-stone-50' : ''}`}
                      onClick={() => handleOpenEditModal(transaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900 tabular-nums">
                        {formatDate(transaction.transaction_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-900 max-w-md">
                        <div className={`truncate flex items-center gap-2 ${transaction.is_ignored ? 'line-through' : ''}`}>
                          {transaction.description}
                          {transaction.is_ignored && (
                            <span className="text-xs bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-medium">IGNORADA</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium tabular-nums ${
                        transaction.transaction_type === 'credit' ? 'text-sage-600' : 'text-rust-600'
                      }`}>
                        {transaction.transaction_type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {transaction.category_id && categories.has(transaction.category_id) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-wheat-100 text-wheat-700 rounded-full">
                            <span>{categories.get(transaction.category_id)!.icon}</span>
                            <span>{categories.get(transaction.category_id)!.name}</span>
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">Não classificada</span>
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
