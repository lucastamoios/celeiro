import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { CategoryBudget, CreateCategoryBudgetRequest, CreatePlannedEntryRequest, PlannedEntryWithStatus } from '../types/budget';
import type { Category } from '../types/category';
import type { ApiResponse, Transaction } from '../types/transaction';
import {
  getCategoryBudgets,
  createCategoryBudget,
  updateCategoryBudget,
  deleteCategoryBudget,
  consolidateCategoryBudget,
  createPlannedEntry,
  updatePlannedEntry,
  deletePlannedEntry,
  getPlannedEntriesForMonth,
  matchPlannedEntry,
  unmatchPlannedEntry,
  dismissPlannedEntry,
  undismissPlannedEntry,
} from '../api/budget';
import { financialUrl } from '../config/api';
import PlannedEntryForm from './PlannedEntryForm';
import MonthlyBudgetCard from './MonthlyBudgetCard';
import TransactionMatcherModal from './TransactionMatcherModal';

interface MonthlyBudgetData {
  month: number;
  year: number;
  budgets: CategoryBudget[];
  isConsolidated: boolean;
}

export default function CategoryBudgetDashboard() {
  const { token } = useAuth();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudgetData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [actualSpending, setActualSpending] = useState<Record<number, string>>({});
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Expanded month state - key is "month-year"
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedMonthEntries, setExpandedMonthEntries] = useState<Record<string, PlannedEntryWithStatus[]>>({});
  const [expandedMonthLoading, setExpandedMonthLoading] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
  const [showCreateEntryModal, setShowCreateEntryModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);
  const [editingEntry, setEditingEntry] = useState<PlannedEntryWithStatus | null>(null);
  const [selectedEntryMonth, setSelectedEntryMonth] = useState<{ month: number; year: number } | null>(null);
  const [matchingEntry, setMatchingEntry] = useState<PlannedEntryWithStatus | null>(null);
  const [matchingMonthYear, setMatchingMonthYear] = useState<{ month: number; year: number } | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'calculated' | 'maior'>('fixed');
  const [plannedAmount, setPlannedAmount] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    fetchAllData();
  }, [token]);

  const fetchAllData = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch categories
      const categoriesResponse = await fetch(
        financialUrl('categories'),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        }
      );

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories');
      }

      const categoriesData: ApiResponse<Category[]> = await categoriesResponse.json();
      setCategories(categoriesData.data);

      // Generate list of months to fetch (last 6 months + current month)
      const monthsToFetch: Array<{ month: number; year: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - 1 - i, 1);
        monthsToFetch.push({
          month: date.getMonth() + 1,
          year: date.getFullYear(),
        });
      }

      // Fetch budgets for all months in parallel
      const allBudgetsPromises = monthsToFetch.map(({ month, year }) =>
        getCategoryBudgets(
          { month, year },
          { token, organizationId: '1' }
        ).then(budgets => ({ month, year, budgets: budgets || [] }))
        .catch(err => {
          console.error(`Failed to fetch budgets for ${month}/${year}:`, err);
          return { month, year, budgets: [] };
        })
      );

      const allBudgetsResults = await Promise.all(allBudgetsPromises);

      // Group budgets by month and check if consolidated
      const monthlyData: MonthlyBudgetData[] = allBudgetsResults.map(({ month, year, budgets }) => {
        const budgetArray = Array.isArray(budgets) ? budgets : [];
        const isConsolidated = budgetArray.length > 0 && budgetArray.every(b => b.IsConsolidated);
        return {
          month,
          year,
          budgets: budgetArray,
          isConsolidated,
        };
      });

      setMonthlyBudgets(monthlyData);

      // Fetch actual spending for all category IDs
      const allCategoryIds = new Set<number>();
      allBudgetsResults.forEach(({ budgets }) => {
        budgets.forEach(b => allCategoryIds.add(b.CategoryID));
      });

      await fetchActualSpending(Array.from(allCategoryIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchActualSpending = async (categoryIds: number[]) => {
    if (!token || categoryIds.length === 0) return;

    // TODO: This should be replaced with a proper backend endpoint
    // For now, we'll set placeholder values
    const spending: Record<number, string> = {};
    categoryIds.forEach(id => {
      spending[id] = '0.00'; // Placeholder
    });
    setActualSpending(spending);
  };

  // Fetch transactions for pattern autocomplete (called when modal opens)
  const fetchTransactionsForPatterns = async () => {
    if (!token) return;

    setTransactionsLoading(true);
    try {
      // Fetch transactions from all accounts for pattern matching
      const accountsResponse = await fetch(financialUrl('accounts'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
        },
      });

      if (!accountsResponse.ok) {
        console.error('Failed to fetch accounts:', accountsResponse.status);
        return;
      }

      const accountsData: ApiResponse<Array<{ AccountID: number }>> = await accountsResponse.json();
      const accounts = accountsData.data || [];
      console.log('Fetched accounts for patterns:', accounts.length);

      if (accounts.length === 0) {
        console.warn('No accounts found for transaction pattern autocomplete');
        return;
      }

      // Fetch transactions from each account
      const allTxPromises = accounts.map(account =>
        fetch(financialUrl(`accounts/${account.AccountID}/transactions`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        })
          .then(res => res.ok ? res.json() : { data: [] })
          .then((data: ApiResponse<Transaction[]>) => data.data || [])
          .catch(() => [] as Transaction[])
      );

      const allTxArrays = await Promise.all(allTxPromises);
      const transactions = allTxArrays.flat();
      console.log('Fetched transactions for patterns:', transactions.length);

      setAllTransactions(transactions);
    } catch (err) {
      console.error('Failed to fetch transactions for patterns:', err);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Fetch transactions when modal opens
  useEffect(() => {
    if (showCreateEntryModal && allTransactions.length === 0) {
      fetchTransactionsForPatterns();
    }
  }, [showCreateEntryModal]);

  const handleCreateBudget = async () => {
    if (!token) return;

    if (!selectedCategoryId) {
      setError('Please select a category');
      return;
    }

    // For fixed budgets, planned amount is required
    if (budgetType === 'fixed') {
      if (!plannedAmount) {
        setError('Please enter a planned amount');
        return;
      }

      const parsedAmount = parseFloat(plannedAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Planned amount must be a valid number greater than 0');
        return;
      }
    }

    // For calculated/maior budgets, default to 0 if not provided
    const parsedAmount = plannedAmount ? parseFloat(plannedAmount) : 0

    setIsSubmitting(true);
    setError(null);

    try {
      const data: CreateCategoryBudgetRequest = {
        category_id: parseInt(selectedCategoryId),
        month: currentMonth,
        year: currentYear,
        budget_type: budgetType,
        planned_amount: parsedAmount,
      };

      await createCategoryBudget(data, { token, organizationId: '1' });

      setSuccessMessage('Category budget created successfully!');
      setShowCreateBudgetModal(false);
      resetBudgetForm();
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBudget = (budget: CategoryBudget) => {
    setEditingBudget(budget);
    setSelectedCategoryId(budget.CategoryID.toString());
    setBudgetType(budget.BudgetType);
    setPlannedAmount(budget.PlannedAmount);
    setShowCreateBudgetModal(true);
  };

  const handleUpdateBudget = async () => {
    if (!token || !editingBudget) return;

    // For fixed budgets, validate planned amount
    if (budgetType === 'fixed') {
      if (!plannedAmount) {
        setError('Please enter a planned amount');
        return;
      }

      const parsedAmount = parseFloat(plannedAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Planned amount must be a valid number greater than 0');
        return;
      }
    }

    // For calculated/maior budgets, use provided amount or 0
    const parsedAmount = plannedAmount ? parseFloat(plannedAmount) : 0

    setIsSubmitting(true);
    setError(null);

    try {
      await updateCategoryBudget(
        editingBudget.CategoryBudgetID,
        {
          budget_type: budgetType,
          planned_amount: parsedAmount,
        },
        { token, organizationId: '1' }
      );

      setSuccessMessage('Budget updated successfully!');
      setShowCreateBudgetModal(false);
      setEditingBudget(null);
      resetBudgetForm();
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (budgetId: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteCategoryBudget(budgetId, { token, organizationId: '1' });

      setSuccessMessage('Budget deleted successfully!');
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConsolidateBudget = async (budgetId: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await consolidateCategoryBudget(budgetId, { token, organizationId: '1' });

      setSuccessMessage('Budget consolidated successfully!');
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to consolidate budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePlannedEntry = async (data: CreatePlannedEntryRequest) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createPlannedEntry(data, { token, organizationId: '1' });

      setSuccessMessage('Entrada planejada criada com sucesso!');
      setShowCreateEntryModal(false);
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar entrada planejada');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for toggling month expansion
  const handleToggleMonthExpand = async (month: number, year: number) => {
    const key = `${month}-${year}`;
    const newExpanded = new Set(expandedMonths);

    if (newExpanded.has(key)) {
      // Collapse
      newExpanded.delete(key);
      setExpandedMonths(newExpanded);
    } else {
      // Expand - always fetch entries when expanding
      newExpanded.add(key);
      setExpandedMonths(newExpanded);

      // Always fetch when expanding (even if previously fetched)
      if (!expandedMonthLoading[key]) {
        await fetchEntriesForMonth(month, year);
      }
    }
  };

  // Fetch entries for a specific month
  const fetchEntriesForMonth = async (month: number, year: number) => {
    if (!token) return;

    const key = `${month}-${year}`;
    setExpandedMonthLoading(prev => ({ ...prev, [key]: true }));

    try {
      const entries = await getPlannedEntriesForMonth(month, year, {
        token,
        organizationId: '1',
      });
      setExpandedMonthEntries(prev => ({ ...prev, [key]: entries || [] }));
    } catch (err) {
      console.error(`Failed to fetch entries for ${month}/${year}:`, err);
      setExpandedMonthEntries(prev => ({ ...prev, [key]: [] }));
    } finally {
      setExpandedMonthLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Handlers for expanded month entries
  const handleMatchExpandedEntry = async (entryId: number, month: number, year: number) => {
    // Find the entry in expanded entries
    const key = `${month}-${year}`;
    const entries = expandedMonthEntries[key] || [];
    const entry = entries.find(e => e.PlannedEntryID === entryId);

    if (!entry) {
      setError('Entrada não encontrada');
      return;
    }

    // Fetch transactions if not already loaded
    if (allTransactions.length === 0) {
      await fetchTransactionsForPatterns();
    }

    // Open the match modal
    setMatchingEntry(entry);
    setMatchingMonthYear({ month, year });
    setShowMatchModal(true);
  };

  const handleUnmatchExpandedEntry = async (entryId: number, month: number, year: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await unmatchPlannedEntry(entryId, month, year, {
        token,
        organizationId: '1',
      });

      setSuccessMessage('Entrada desvinculada com sucesso!');
      await fetchEntriesForMonth(month, year);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desvincular entrada');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissExpandedEntry = async (entryId: number, month: number, year: number, reason?: string) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await dismissPlannedEntry(entryId, {
        month,
        year,
        reason,
      }, {
        token,
        organizationId: '1',
      });

      setSuccessMessage('Entrada dispensada com sucesso!');
      await fetchEntriesForMonth(month, year);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao dispensar entrada');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndismissExpandedEntry = async (entryId: number, month: number, year: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await undismissPlannedEntry(entryId, month, year, {
        token,
        organizationId: '1',
      });

      setSuccessMessage('Entrada reativada com sucesso!');
      await fetchEntriesForMonth(month, year);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reativar entrada');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for confirming transaction match
  const handleConfirmMatch = async (transactionId: number) => {
    if (!token || !matchingEntry || !matchingMonthYear) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await matchPlannedEntry(
        matchingEntry.PlannedEntryID,
        {
          transaction_id: transactionId,
          month: matchingMonthYear.month,
          year: matchingMonthYear.year,
        },
        {
          token,
          organizationId: '1',
        }
      );

      setSuccessMessage('Transação vinculada com sucesso!');
      setShowMatchModal(false);
      setMatchingEntry(null);
      setMatchingMonthYear(null);

      // Refresh entries for the specific month
      const key = `${matchingMonthYear.month}-${matchingMonthYear.year}`;
      if (expandedMonthEntries[key]) {
        await fetchEntriesForMonth(matchingMonthYear.month, matchingMonthYear.year);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao vincular transação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseMatchModal = () => {
    setShowMatchModal(false);
    setMatchingEntry(null);
    setMatchingMonthYear(null);
  };

  // Edit handler for planned entries
  const handleEditPlannedEntry = (entry: PlannedEntryWithStatus, month: number, year: number) => {
    setEditingEntry(entry);
    setSelectedEntryMonth({ month, year });
    setShowCreateEntryModal(true);
  };

  // Delete handler for planned entries
  const handleDeletePlannedEntry = async (entryId: number, month: number, year: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deletePlannedEntry(entryId, {
        token,
        organizationId: '1',
      });

      setSuccessMessage('Entrada planejada excluída com sucesso!');

      // Refresh entries for the specific month
      const key = `${month}-${year}`;
      if (expandedMonthEntries[key]) {
        await fetchEntriesForMonth(month, year);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir entrada planejada');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update handler for planned entries
  const handleUpdatePlannedEntry = async (data: CreatePlannedEntryRequest) => {
    if (!token || !editingEntry) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updatePlannedEntry(editingEntry.PlannedEntryID, data, {
        token,
        organizationId: '1',
      });

      setSuccessMessage('Entrada planejada atualizada com sucesso!');
      setShowCreateEntryModal(false);
      setEditingEntry(null);
      setSelectedEntryMonth(null);

      // Refresh entries for the specific month
      if (selectedEntryMonth) {
        const key = `${selectedEntryMonth.month}-${selectedEntryMonth.year}`;
        if (expandedMonthEntries[key]) {
          await fetchEntriesForMonth(selectedEntryMonth.month, selectedEntryMonth.year);
        }
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar entrada planejada');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetBudgetForm = () => {
    setSelectedCategoryId('');
    setBudgetType('fixed');
    setPlannedAmount('');
  };

  const handleCancelBudgetForm = () => {
    setShowCreateBudgetModal(false);
    setEditingBudget(null);
    resetBudgetForm();
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-9 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-2/3"></div>
          </div>

          {/* Month/Year selector skeleton */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="h-10 bg-gray-200 rounded w-32"></div>
                <div className="h-10 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-200 rounded w-40"></div>
                <div className="h-10 bg-gray-200 rounded w-40"></div>
              </div>
            </div>
          </div>

          {/* Category budget cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Orçamentos</h1>
            <p className="text-gray-600">
              Acompanhe seus orçamentos mensais por categoria
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateEntryModal(true)}
              className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              + Entrada Planejada
            </button>
            <button
              onClick={() => setShowCreateBudgetModal(true)}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Orçamento de Categoria
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Monthly Budget Timeline */}
        {monthlyBudgets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum orçamento encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Crie seu primeiro orçamento de categoria para começar a rastrear despesas
            </p>
            <button
              onClick={() => setShowCreateBudgetModal(true)}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Criar Primeiro Orçamento
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {monthlyBudgets
              .slice()
              .reverse()
              .map(({ month, year, budgets, isConsolidated }) => {
                const isCurrent = month === currentMonth && year === currentYear;
                const key = `${month}-${year}`;
                const isExpanded = expandedMonths.has(key);
                const entries = expandedMonthEntries[key] || [];
                const entriesLoading = expandedMonthLoading[key] || false;

                return (
                  <MonthlyBudgetCard
                    key={`${year}-${month}`}
                    month={month}
                    year={year}
                    budgets={budgets}
                    categories={categories}
                    actualSpending={actualSpending}
                    isCurrent={isCurrent}
                    isConsolidated={isConsolidated}
                    isExpanded={isExpanded}
                    plannedEntries={entries}
                    plannedEntriesLoading={entriesLoading}
                    onEditBudget={handleEditBudget}
                    onDeleteBudget={handleDeleteBudget}
                    onConsolidate={handleConsolidateBudget}
                    onToggleExpand={() => handleToggleMonthExpand(month, year)}
                    onMatchEntry={(entryId) => handleMatchExpandedEntry(entryId, month, year)}
                    onUnmatchEntry={(entryId) => handleUnmatchExpandedEntry(entryId, month, year)}
                    onDismissEntry={(entryId, reason) => handleDismissExpandedEntry(entryId, month, year, reason)}
                    onUndismissEntry={(entryId) => handleUndismissExpandedEntry(entryId, month, year)}
                    onEditEntry={(entry) => handleEditPlannedEntry(entry, month, year)}
                    onDeleteEntry={(entryId) => handleDeletePlannedEntry(entryId, month, year)}
                  />
                );
              })}
          </div>
        )}

        {/* Create/Edit Budget Modal */}
        {showCreateBudgetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {editingBudget ? 'Edit Category Budget' : 'Create Category Budget'}
              </h3>

              <div className="space-y-4">
                {/* Category Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    disabled={!!editingBudget || isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select a category</option>
                    {categories?.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Type *
                  </label>
                  <select
                    value={budgetType}
                    onChange={(e) => setBudgetType(e.target.value as any)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="calculated">Calculated</option>
                    <option value="maior">Maior</option>
                  </select>
                </div>

                {/* Planned Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planned Amount {budgetType === 'fixed' ? '*' : '(Optional)'}
                  </label>
                  {budgetType !== 'fixed' && (
                    <p className="text-xs text-gray-500 mb-2">
                      💡 For calculated budgets, the amount will be automatically calculated from planned entries
                    </p>
                  )}
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={plannedAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setPlannedAmount(value);
                        }
                      }}
                      disabled={isSubmitting}
                      placeholder={budgetType === 'fixed' ? '0.00' : '0.00 (will be calculated)'}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCancelBudgetForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingBudget ? handleUpdateBudget : handleCreateBudget}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingBudget ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Planned Entry Modal */}
        {showCreateEntryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {editingEntry ? 'Editar Entrada Planejada' : 'Criar Entrada Planejada'}
              </h3>

              <PlannedEntryForm
                categories={categories}
                transactions={allTransactions}
                transactionsLoading={transactionsLoading}
                onSubmit={editingEntry ? handleUpdatePlannedEntry : handleCreatePlannedEntry}
                onCancel={() => {
                  setShowCreateEntryModal(false);
                  setEditingEntry(null);
                  setSelectedEntryMonth(null);
                }}
                initialEntry={editingEntry ? {
                  PlannedEntryID: editingEntry.PlannedEntryID,
                  UserID: 0,
                  OrganizationID: 0,
                  CategoryID: editingEntry.CategoryID,
                  Description: editingEntry.Description,
                  Amount: editingEntry.Amount,
                  AmountMin: editingEntry.AmountMin,
                  AmountMax: editingEntry.AmountMax,
                  ExpectedDay: editingEntry.ExpectedDay,
                  ExpectedDayStart: editingEntry.ExpectedDayStart,
                  ExpectedDayEnd: editingEntry.ExpectedDayEnd,
                  EntryType: editingEntry.EntryType,
                  IsRecurrent: editingEntry.IsRecurrent,
                  IsSavedPattern: false,
                  IsActive: true,
                  ParentEntryID: editingEntry.ParentEntryID,
                  PatternID: editingEntry.PatternID,
                  CreatedAt: '',
                  UpdatedAt: '',
                } : undefined}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        )}

        {/* Transaction Matcher Modal */}
        {matchingEntry && matchingMonthYear && (
          <TransactionMatcherModal
            isOpen={showMatchModal}
            onClose={handleCloseMatchModal}
            onSelect={handleConfirmMatch}
            plannedEntry={matchingEntry}
            transactions={allTransactions}
            categories={categories}
            month={matchingMonthYear.month}
            year={matchingMonthYear.year}
            isLoading={isSubmitting || transactionsLoading}
          />
        )}
      </div>
    </div>
  );
}
