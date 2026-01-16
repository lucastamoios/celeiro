import { useEffect, useState, useCallback } from 'react';
import { BarChart3, Copy, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useSelectedMonth } from '../hooks/useSelectedMonth';
import type { CategoryBudget, CreateCategoryBudgetRequest, CreatePlannedEntryRequest, PlannedEntryWithStatus } from '../types/budget';
import type { Category } from '../types/category';
import type { ApiResponse, Transaction } from '../types/transaction';
import type { SavingsGoal } from '../types/savingsGoals';
import {
  getCategoryBudgets,
  createCategoryBudget,
  updateCategoryBudget,
  deleteCategoryBudget,
  consolidateCategoryBudget,
  copyCategoryBudgetsFromMonth,
  createPlannedEntry,
  updatePlannedEntry,
  deletePlannedEntry,
  getPlannedEntriesForMonth,
  matchPlannedEntry,
  unmatchPlannedEntry,
  dismissPlannedEntry,
  undismissPlannedEntry,
} from '../api/budget';
import { listSavingsGoals } from '../api/savingsGoals';
import { financialUrl } from '../config/api';
import PlannedEntryForm from './PlannedEntryForm';
import MonthlyBudgetCard from './MonthlyBudgetCard';
import { generateBudgetExportText, copyToClipboard } from '../utils/budgetExport';
import TransactionMatcherModal from './TransactionMatcherModal';
import CategoryTransactionsModal from './CategoryTransactionsModal';
import TransactionEditModal from './TransactionEditModal';
import Modal from './ui/Modal';

interface MonthlyBudgetData {
  month: number;
  year: number;
  budgets: CategoryBudget[];
  isConsolidated: boolean;
}

export default function CategoryBudgetDashboard() {
  const { token } = useAuth();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization_id?.toString() || '1';

  // Shared month selection (synced across pages)
  const {
    selectedMonth,
    selectedYear,
    goToPreviousMonth: handlePreviousMonth,
    goToNextMonth: handleNextMonth,
    goToCurrentMonth: handleGoToCurrentMonth,
    isCurrentMonth,
    currentMonth,
    currentYear,
  } = useSelectedMonth();

  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudgetData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Per-month actual spending: { "month-year": { categoryId: "amount" } }
  const [actualSpending, setActualSpending] = useState<Record<string, Record<number, string>>>({});
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
  const [showCategoryTransactionsModal, setShowCategoryTransactionsModal] = useState(false);
  const [selectedCategoryForTransactions, setSelectedCategoryForTransactions] = useState<number | null>(null);
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);
  const [editingEntry, setEditingEntry] = useState<PlannedEntryWithStatus | null>(null);
  const [selectedEntryMonth, setSelectedEntryMonth] = useState<{ month: number; year: number } | null>(null);
  const [matchingEntry, setMatchingEntry] = useState<PlannedEntryWithStatus | null>(null);
  const [matchingMonthYear, setMatchingMonthYear] = useState<{ month: number; year: number } | null>(null);
  const [editingTransactionFromBudget, setEditingTransactionFromBudget] = useState<Transaction | null>(null);
  const [editingPlannedEntryFromBudget, setEditingPlannedEntryFromBudget] = useState<PlannedEntryWithStatus | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'calculated' | 'maior'>('fixed');
  const [plannedAmount, setPlannedAmount] = useState<string>('');

  // Savings goals for planned entry linking
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  // Fetch savings goals for the goal selector in PlannedEntryForm
  const fetchSavingsGoals = useCallback(async () => {
    if (!token) return;
    try {
      const goals = await listSavingsGoals({ is_completed: false }, { token });
      setSavingsGoals(goals || []);
    } catch (err) {
      console.error('Failed to fetch savings goals:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchSavingsGoals();
  }, [fetchSavingsGoals]);

  // Handle ESC key to close modals (innermost first)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close innermost modal first
        if (editingPlannedEntryFromBudget) {
          setEditingPlannedEntryFromBudget(null);
        } else if (editingTransactionFromBudget) {
          setEditingTransactionFromBudget(null);
        } else if (showCategoryTransactionsModal) {
          setShowCategoryTransactionsModal(false);
          setSelectedCategoryForTransactions(null);
        } else if (showCreateBudgetModal) {
          setShowCreateBudgetModal(false);
          setEditingBudget(null);
        } else if (showCreateEntryModal) {
          setShowCreateEntryModal(false);
          setEditingEntry(null);
        } else if (showMatchModal) {
          setShowMatchModal(false);
          setMatchingEntry(null);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCreateBudgetModal, showCreateEntryModal, showMatchModal, showCategoryTransactionsModal, editingTransactionFromBudget, editingPlannedEntryFromBudget]);

  useEffect(() => {
    if (!token) return;
    fetchAllData();
  }, [token]);

  // Fetch data for the selected month if not already loaded
  useEffect(() => {
    if (!token || loading) return;

    const monthKey = `${selectedMonth}-${selectedYear}`;
    const isMonthLoaded = monthlyBudgets.some(
      m => m.month === selectedMonth && m.year === selectedYear
    );

    if (!isMonthLoaded) {
      // Fetch budget data for the selected month on-demand
      const fetchSelectedMonthData = async () => {
        try {
          // Fetch budgets for the selected month
          const budgets = await getCategoryBudgets(
            { month: selectedMonth, year: selectedYear },
            { token, organizationId }
          );

          const budgetArray = Array.isArray(budgets) ? budgets : [];
          const isConsolidated = budgetArray.length > 0 && budgetArray.every(b => b.IsConsolidated);

          // Add to monthly budgets
          setMonthlyBudgets(prev => [
            ...prev,
            {
              month: selectedMonth,
              year: selectedYear,
              budgets: budgetArray,
              isConsolidated,
            }
          ]);

          // Fetch planned entries for the selected month
          const entries = await getPlannedEntriesForMonth(selectedMonth, selectedYear, {
            token,
            organizationId,
          });
          setExpandedMonthEntries(prev => ({
            ...prev,
            [monthKey]: entries || [],
          }));

        } catch (err) {
          console.error(`Failed to fetch data for ${selectedMonth}/${selectedYear}:`, err);
        }
      };

      fetchSelectedMonthData();
    }
  }, [token, selectedMonth, selectedYear, loading, monthlyBudgets]);

  const fetchAllData = async () => {
    console.log('📊 [fetchAllData] Starting data fetch...');
    if (!token) {
      console.log('📊 [fetchAllData] No token, aborting');
      return;
    }

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
      console.log('📊 [fetchAllData] Months to fetch:', monthsToFetch);

      // Fetch budgets for all months in parallel
      const allBudgetsPromises = monthsToFetch.map(({ month, year }) =>
        getCategoryBudgets(
          { month, year },
          { token, organizationId }
        ).then(budgets => {
          console.log(`📊 [fetchAllData] Budgets for ${month}/${year}:`, budgets?.length || 0, 'items', budgets?.map(b => ({ id: b.CategoryBudgetID, categoryId: b.CategoryID })));
          return { month, year, budgets: budgets || [] };
        })
        .catch(err => {
          console.error(`❌ [fetchAllData] Failed to fetch budgets for ${month}/${year}:`, err);
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

      console.log('📊 [fetchAllData] Final monthly data:', monthlyData.map(m => ({
        month: m.month,
        year: m.year,
        budgetCount: m.budgets.length,
        budgetIds: m.budgets.map(b => b.CategoryBudgetID),
      })));

      setMonthlyBudgets(monthlyData);

      // Fetch all transactions to calculate actual spending
      await fetchAndCalculateActualSpending();
      console.log('📊 [fetchAllData] Data fetch complete');
    } catch (err) {
      console.error('❌ [fetchAllData] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all transactions and planned entries, then calculate spending per category per month
  // For "Maior" budgets: Planned Entries + Unmatched Transactions (to avoid double-counting)
  const fetchAndCalculateActualSpending = async () => {
    if (!token) return;

    try {
      // Generate list of months to fetch (last 6 months + current month)
      const monthsToFetch: Array<{ month: number; year: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - 1 - i, 1);
        monthsToFetch.push({
          month: date.getMonth() + 1,
          year: date.getFullYear(),
        });
      }

      // Fetch accounts first
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

      if (accounts.length === 0) {
        console.warn('No accounts found for spending calculation');
        return;
      }

      // Fetch transactions and planned entries in parallel
      const [allTxArrays, allEntriesResults] = await Promise.all([
        // Fetch transactions from each account
        Promise.all(accounts.map(account =>
          fetch(financialUrl(`accounts/${account.AccountID}/transactions`), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Active-Organization': '1',
            },
          })
            .then(res => res.ok ? res.json() : { data: [] })
            .then((data: ApiResponse<Transaction[]>) => data.data || [])
            .catch(() => [] as Transaction[])
        )),
        // Fetch planned entries for all months
        Promise.all(monthsToFetch.map(({ month, year }) =>
          getPlannedEntriesForMonth(month, year, { token, organizationId })
            .then(entries => ({ month, year, entries: entries || [] }))
            .catch(() => ({ month, year, entries: [] as PlannedEntryWithStatus[] }))
        ))
      ]);

      const transactions = allTxArrays.flat();
      setAllTransactions(transactions);

      // Build a map of planned entries by month-year
      const plannedEntriesByMonth: Record<string, PlannedEntryWithStatus[]> = {};
      allEntriesResults.forEach(({ month, year, entries }) => {
        const key = `${month}-${year}`;
        plannedEntriesByMonth[key] = entries;
      });

      // Also update expandedMonthEntries with this data
      setExpandedMonthEntries(plannedEntriesByMonth);

      // Calculate spending: Planned Entries + Unmatched Transactions
      const spending: Record<string, Record<number, string>> = {};

      // Build a set of income category IDs (to exclude from spending)
      // Note: We need to fetch categories here since this function runs separately
      const categoriesResponse = await fetch(financialUrl('categories'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
        },
      });
      const categoriesData: ApiResponse<Category[]> = await categoriesResponse.json();
      const incomeCategoryIds = new Set<number>(
        (categoriesData.data || [])
          .filter(c => c.category_type === 'income')
          .map(c => c.category_id)
      );

      // Step 1: Build a set of matched transaction IDs per month
      const matchedTxIdsByMonth: Record<string, Set<number>> = {};
      Object.entries(plannedEntriesByMonth).forEach(([key, entries]) => {
        matchedTxIdsByMonth[key] = new Set();
        entries.forEach(entry => {
          if (entry.MatchedTransactionID) {
            matchedTxIdsByMonth[key].add(entry.MatchedTransactionID);
          }
        });
      });

      // Step 2: Add planned entries contribution (expenses only)
      Object.entries(plannedEntriesByMonth).forEach(([key, entries]) => {
        if (!spending[key]) {
          spending[key] = {};
        }

        entries.forEach(entry => {
          // Skip dismissed entries, income entries, and entries for income categories
          if (entry.Status === 'dismissed' || entry.EntryType === 'income' || incomeCategoryIds.has(entry.CategoryID)) {
            return;
          }

          // Use MatchedAmount if matched, otherwise use Amount (expected)
          const amount = entry.Status === 'matched' && entry.MatchedAmount
            ? parseFloat(entry.MatchedAmount)
            : parseFloat(entry.Amount);

          if (!isNaN(amount) && amount > 0) {
            const currentAmount = parseFloat(spending[key][entry.CategoryID] || '0');
            spending[key][entry.CategoryID] = (currentAmount + amount).toFixed(2);
          }
        });
      });

      // Step 3: Add unmatched transactions (debits/expenses only)
      transactions.forEach(tx => {
        // Skip ignored, uncategorized, credit transactions, and transactions in income categories
        if (tx.is_ignored || !tx.category_id || tx.transaction_type === 'credit' || incomeCategoryIds.has(tx.category_id)) {
          return;
        }

        // Parse as local time to avoid timezone shift
        const txDate = new Date(tx.transaction_date + 'T00:00:00');
        const month = txDate.getMonth() + 1;
        const year = txDate.getFullYear();
        const key = `${month}-${year}`;

        // Skip if this transaction is matched to a planned entry
        if (matchedTxIdsByMonth[key]?.has(tx.transaction_id)) {
          return;
        }

        if (!spending[key]) {
          spending[key] = {};
        }

        const currentAmount = parseFloat(spending[key][tx.category_id] || '0');
        const txAmount = parseFloat(tx.amount);
        spending[key][tx.category_id] = (currentAmount + txAmount).toFixed(2);
      });

      // Step 4: Calculate actual income for income categories (from credit transactions)
      transactions.forEach(tx => {
        // Only include credit transactions in income categories
        if (tx.is_ignored || !tx.category_id || tx.transaction_type !== 'credit' || !incomeCategoryIds.has(tx.category_id)) {
          return;
        }

        // Parse as local time to avoid timezone shift
        const txDate = new Date(tx.transaction_date + 'T00:00:00');
        const month = txDate.getMonth() + 1;
        const year = txDate.getFullYear();
        const key = `${month}-${year}`;

        if (!spending[key]) {
          spending[key] = {};
        }

        const currentAmount = parseFloat(spending[key][tx.category_id] || '0');
        // Use absolute value since credit amounts are stored as positive
        const txAmount = Math.abs(parseFloat(tx.amount));
        spending[key][tx.category_id] = (currentAmount + txAmount).toFixed(2);
      });

      setActualSpending(spending);
    } catch (err) {
      console.error('Failed to calculate actual spending:', err);
    }
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
        month: selectedMonth,
        year: selectedYear,
        budget_type: budgetType,
        planned_amount: parsedAmount,
      };

      await createCategoryBudget(data, { token, organizationId });

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
        { token, organizationId }
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
      await deleteCategoryBudget(budgetId, { token, organizationId });

      setSuccessMessage('Budget deleted successfully!');
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMonth = async (
    month: number,
    year: number,
    budgetIds: number[],
    plannedEntryIds: number[]
  ) => {
    console.log('🗑️ [handleDeleteMonth] Starting deletion for:', { month, year });
    console.log('🗑️ [handleDeleteMonth] Budget IDs to delete:', budgetIds);
    console.log('🗑️ [handleDeleteMonth] Planned Entry IDs to dismiss:', plannedEntryIds);

    if (!token) {
      console.log('🗑️ [handleDeleteMonth] No token, aborting');
      return;
    }

    // Nothing to delete
    if (budgetIds.length === 0 && plannedEntryIds.length === 0) {
      console.log('🗑️ [handleDeleteMonth] Nothing to delete');
      setError('Não há dados para excluir neste mês');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Delete all budgets for this month in parallel
      console.log('🗑️ [handleDeleteMonth] Starting budget deletions...');
      const budgetDeletions = budgetIds.map((id) => {
        console.log(`🗑️ [handleDeleteMonth] Deleting budget ID: ${id}`);
        return deleteCategoryBudget(id, { token, organizationId })
          .then((result) => {
            console.log(`✅ [handleDeleteMonth] Budget ${id} deleted successfully`, result);
            return result;
          })
          .catch((err) => {
            console.error(`❌ [handleDeleteMonth] Budget ${id} deletion FAILED:`, err);
            throw err;
          });
      });

      // Dismiss all planned entries for this month in parallel
      console.log('🗑️ [handleDeleteMonth] Starting planned entry dismissals...');
      const entryDismissals = plannedEntryIds.map((id) => {
        console.log(`🗑️ [handleDeleteMonth] Dismissing planned entry ID: ${id} for month ${month}/${year}`);
        return dismissPlannedEntry(id, { month, year }, { token, organizationId })
          .then((result) => {
            console.log(`✅ [handleDeleteMonth] Planned entry ${id} dismissed successfully`, result);
            return result;
          })
          .catch((err) => {
            console.error(`❌ [handleDeleteMonth] Planned entry ${id} dismissal FAILED:`, err);
            throw err;
          });
      });

      console.log('🗑️ [handleDeleteMonth] Waiting for all operations to complete...');
      const results = await Promise.all([...budgetDeletions, ...entryDismissals]);
      console.log('✅ [handleDeleteMonth] All operations completed:', results);

      const monthName = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
      const parts = [];
      if (budgetIds.length > 0) parts.push(`${budgetIds.length} orçamentos`);
      if (plannedEntryIds.length > 0) parts.push(`${plannedEntryIds.length} entradas planejadas`);
      setSuccessMessage(`✅ ${parts.join(' e ')} de ${monthName} ${year} removidos com sucesso!`);

      console.log('🗑️ [handleDeleteMonth] Refreshing data with fetchAllData()...');
      await fetchAllData();
      console.log('✅ [handleDeleteMonth] Data refreshed, checking monthlyBudgets state...');

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('❌ [handleDeleteMonth] Error during deletion:', err);
      setError(err instanceof Error ? err.message : 'Falha ao excluir dados do mês');
    } finally {
      setIsSubmitting(false);
      console.log('🗑️ [handleDeleteMonth] Deletion process finished');
    }
  };

  const handleConsolidateBudget = async (budgetId: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await consolidateCategoryBudget(budgetId, { token, organizationId });

      setSuccessMessage('Budget consolidated successfully!');
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to consolidate budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConsolidateAllBudgets = async () => {
    if (!token) return;

    const unconsolidatedBudgets = selectedMonthBudgets.filter(b => !b.IsConsolidated);
    if (unconsolidatedBudgets.length === 0) {
      setSuccessMessage('Todos os orçamentos já estão consolidados!');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Consolidate all unconsolidated budgets in parallel
      await Promise.all(
        unconsolidatedBudgets.map(budget =>
          consolidateCategoryBudget(budget.CategoryBudgetID, { token, organizationId })
        )
      );

      const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
      setSuccessMessage(`✅ ${unconsolidatedBudgets.length} orçamento${unconsolidatedBudgets.length === 1 ? '' : 's'} de ${monthName} consolidado${unconsolidatedBudgets.length === 1 ? '' : 's'} com sucesso!`);
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao consolidar orçamentos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyFromPreviousMonth = async (targetMonth: number, targetYear: number) => {
    if (!token) return;

    // Calculate previous month
    let sourceMonth = targetMonth - 1;
    let sourceYear = targetYear;
    if (sourceMonth < 1) {
      sourceMonth = 12;
      sourceYear -= 1;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const copiedBudgets = await copyCategoryBudgetsFromMonth(
        {
          source_month: sourceMonth,
          source_year: sourceYear,
          target_month: targetMonth,
          target_year: targetYear,
        },
        { token, organizationId }
      );

      if (copiedBudgets.length === 0) {
        // Nothing was copied - either source is empty or target already has all budgets
        setSuccessMessage('Nenhum orçamento novo para copiar - todos já existem no mês de destino');
      } else {
        setSuccessMessage(`${copiedBudgets.length} orçamento${copiedBudgets.length === 1 ? '' : 's'} copiado${copiedBudgets.length === 1 ? '' : 's'} com sucesso!`);
      }
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao copiar orçamentos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePlannedEntry = async (data: CreatePlannedEntryRequest) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createPlannedEntry(data, { token, organizationId });

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
        organizationId,
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
        organizationId,
      });

      setSuccessMessage('Entrada desvinculada com sucesso!');
      // Recalculate spending since match status changed
      await fetchAndCalculateActualSpending();

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
        organizationId,
      });

      setSuccessMessage('Entrada dispensada com sucesso!');
      // Recalculate spending since dismissed entries are excluded
      await fetchAndCalculateActualSpending();

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
        organizationId,
      });

      setSuccessMessage('Entrada reativada com sucesso!');
      // Recalculate spending since entry is now active again
      await fetchAndCalculateActualSpending();

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
          organizationId,
        }
      );

      setSuccessMessage('Transação vinculada com sucesso!');
      setShowMatchModal(false);
      setMatchingEntry(null);
      setMatchingMonthYear(null);

      // Recalculate spending since match status changed
      await fetchAndCalculateActualSpending();

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

  // Handler for opening category transactions modal
  const handleCategoryCardClick = (categoryId: number) => {
    setSelectedCategoryForTransactions(categoryId);
    setShowCategoryTransactionsModal(true);
  };

  const handleCloseCategoryTransactionsModal = () => {
    setShowCategoryTransactionsModal(false);
    setSelectedCategoryForTransactions(null);
  };

  // Handler for clicking a transaction in the category modal
  const handleTransactionClickInBudget = (transaction: Transaction) => {
    setEditingTransactionFromBudget(transaction);
  };

  // Handler for closing the transaction edit modal
  const handleCloseTransactionEditModal = () => {
    setEditingTransactionFromBudget(null);
  };

  // Handler for saving the transaction (refresh data)
  const handleSaveTransactionFromBudget = async () => {
    setEditingTransactionFromBudget(null);
    await fetchAllData();
  };

  // Handler for clicking a planned entry in the category modal
  const handlePlannedEntryClickInBudget = (entry: PlannedEntryWithStatus) => {
    setEditingPlannedEntryFromBudget(entry);
  };

  // Handler for closing the planned entry edit modal (from budget view)
  const handleClosePlannedEntryEditModal = () => {
    setEditingPlannedEntryFromBudget(null);
  };

  // Handler for saving the planned entry (from budget view)
  const handleSavePlannedEntryFromBudget = async (data: CreatePlannedEntryRequest) => {
    if (!token || !editingPlannedEntryFromBudget) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updatePlannedEntry(editingPlannedEntryFromBudget.PlannedEntryID, data, {
        token,
        organizationId,
      });

      setSuccessMessage('Entrada planejada atualizada com sucesso!');
      setEditingPlannedEntryFromBudget(null);
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar entrada planejada');
    } finally {
      setIsSubmitting(false);
    }
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
        organizationId,
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
        organizationId,
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

  // Export budget data for AI planning
  const handleExportBudget = async () => {
    const exportText = generateBudgetExportText({
      month: selectedMonth,
      year: selectedYear,
      budgets: selectedMonthBudgets,
      plannedEntries: selectedMonthEntries,
      categories,
      actualSpending: selectedMonthSpending,
    });

    try {
      await copyToClipboard(exportText);
      setSuccessMessage('Orçamento copiado para a área de transferência!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Falha ao copiar orçamento');
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

  // Month navigation helpers
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getMonthName = (month: number) => monthNames[month - 1];

  // Get data for the selected month
  const selectedMonthKey = `${selectedMonth}-${selectedYear}`;
  const selectedMonthData = monthlyBudgets.find(
    m => m.month === selectedMonth && m.year === selectedYear
  );
  const selectedMonthBudgets = selectedMonthData?.budgets || [];
  const selectedMonthSpending = actualSpending[selectedMonthKey] || {};
  const selectedMonthEntries = expandedMonthEntries[selectedMonthKey] || [];
  const selectedMonthEntriesLoading = expandedMonthLoading[selectedMonthKey] || false;

  // Build a set of income category IDs for filtering
  const incomeCategoryIds = new Set(
    categories
      .filter(c => c.category_type === 'income')
      .map(c => c.category_id)
  );

  // Calculate totals for summary (EXPENSES ONLY - exclude income categories)
  const expenseBudgets = selectedMonthBudgets.filter(b => !incomeCategoryIds.has(b.CategoryID));
  const totalPlanned = expenseBudgets.reduce(
    (sum, b) => sum + parseFloat(b.PlannedAmount || '0'), 0
  );
  // Sum spending only for expense categories
  const totalSpent = expenseBudgets.reduce(
    (sum, b) => sum + parseFloat(selectedMonthSpending[b.CategoryID] || '0'), 0
  );
  const spentPercentage = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0;

  // Calculate income totals separately
  const incomeBudgets = selectedMonthBudgets.filter(b => incomeCategoryIds.has(b.CategoryID));
  const totalPlannedIncome = incomeBudgets.reduce(
    (sum, b) => sum + parseFloat(b.PlannedAmount || '0'), 0
  );
  const totalActualIncome = incomeBudgets.reduce(
    (sum, b) => sum + parseFloat(selectedMonthSpending[b.CategoryID] || '0'), 0
  );

  // Check if previous month has budgets (for copy button)
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevMonthData = monthlyBudgets.find(m => m.month === prevMonth && m.year === prevYear);
  const hasPreviousMonthBudgets = prevMonthData ? prevMonthData.budgets.length > 0 : false;

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-9 bg-stone-200 rounded w-1/3 mb-2"></div>
            <div className="h-5 bg-stone-200 rounded w-2/3"></div>
          </div>

          {/* Month/Year selector skeleton */}
          <div className="card mb-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="h-10 bg-stone-200 rounded w-32"></div>
                <div className="h-10 bg-stone-200 rounded w-24"></div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 bg-stone-200 rounded w-40"></div>
                <div className="h-10 bg-stone-200 rounded w-40"></div>
              </div>
            </div>
          </div>

          {/* Category budget cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card">
                <div className="h-6 bg-stone-200 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-stone-200 rounded w-1/2 mb-3"></div>
                <div className="h-2 bg-stone-200 rounded w-full mb-2"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-stone-200 rounded w-1/4"></div>
                  <div className="h-4 bg-stone-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Month Navigation Header */}
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
                {isCurrentMonth && (
                  <span className="text-xs text-wheat-600 font-medium">Mês atual</span>
                )}
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

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center sm:justify-end">
              <button
                onClick={handleExportBudget}
                className="btn-secondary text-sm inline-flex items-center gap-1"
                title="Exportar orçamento para AI"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <button
                onClick={() => setShowCreateEntryModal(true)}
                className="btn-secondary text-sm"
              >
                + Entrada
              </button>
              <button
                onClick={() => setShowCreateBudgetModal(true)}
                className="btn-primary text-sm"
              >
                + Orçamento
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Summary Card */}
        <div className="mb-6 card border-wheat-200 border-2 bg-wheat-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">
            {/* Planned */}
            <div className="text-center">
              <p className="text-sm text-stone-500 mb-1">Planejado</p>
              <p className="text-xl sm:text-2xl font-bold text-stone-900 tabular-nums">
                R$ {totalPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Spent */}
            <div className="text-center">
              <p className="text-sm text-stone-500 mb-1">Gasto</p>
              <p className={`text-xl sm:text-2xl font-bold tabular-nums ${spentPercentage > 100 ? 'text-rust-600' : 'text-stone-900'}`}>
                R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Progress */}
            <div className="text-center">
              <p className="text-sm text-stone-500 mb-1">Progresso</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-24 progress-bar">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      spentPercentage > 100 ? 'bg-rust-500' : spentPercentage > 80 ? 'bg-terra-500' : 'bg-sage-500'
                    }`}
                    style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                  />
                </div>
                <span className={`text-lg font-bold ${spentPercentage > 100 ? 'text-rust-600' : 'text-stone-900'}`}>
                  {spentPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-sm text-stone-600 pt-3 border-t border-wheat-200">
            <span>{selectedMonthBudgets.length} {selectedMonthBudgets.length === 1 ? 'categoria' : 'categorias'}</span>
            <span className="text-wheat-400 hidden sm:inline">•</span>
            <span>{selectedMonthEntries.length} {selectedMonthEntries.length === 1 ? 'entrada' : 'entradas'} planejadas</span>
            {hasPreviousMonthBudgets && selectedMonthBudgets.length === 0 && (
              <>
                <span className="text-wheat-400 hidden sm:inline">•</span>
                <button
                  onClick={() => handleCopyFromPreviousMonth(selectedMonth, selectedYear)}
                  disabled={isSubmitting}
                  className="text-wheat-600 hover:text-wheat-800 font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Copiar do mês anterior
                </button>
              </>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-sage-50 border border-sage-200 rounded-lg p-4 mb-6">
            <p className="text-sage-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-rust-50 border border-rust-200 rounded-lg p-4 mb-6">
            <p className="text-rust-800">{error}</p>
          </div>
        )}

        {/* Single Month Budget View */}
        {selectedMonthBudgets.length === 0 && selectedMonthEntries.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="flex justify-center mb-4">
              <BarChart3 className="w-16 h-16 text-stone-300" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              Nenhum orçamento para {getMonthName(selectedMonth)} {selectedYear}
            </h3>
            <p className="text-stone-600 mb-4">
              Crie um orçamento de categoria ou entrada planejada para começar
            </p>
            <div className="flex gap-3 justify-center">
              {hasPreviousMonthBudgets && (
                <button
                  onClick={() => handleCopyFromPreviousMonth(selectedMonth, selectedYear)}
                  disabled={isSubmitting}
                  className="btn-secondary disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Copiar do mês anterior
                </button>
              )}
              <button
                onClick={() => setShowCreateBudgetModal(true)}
                className="btn-primary"
              >
                + Criar Orçamento
              </button>
            </div>
          </div>
        ) : (
          <MonthlyBudgetCard
            month={selectedMonth}
            year={selectedYear}
            budgets={selectedMonthBudgets}
            categories={categories}
            actualSpending={selectedMonthSpending}
            isCurrent={isCurrentMonth}
            isConsolidated={selectedMonthData?.isConsolidated || false}
            isExpanded={expandedMonths.has(selectedMonthKey)}
            plannedEntries={selectedMonthEntries}
            plannedEntriesLoading={selectedMonthEntriesLoading}
            hasPreviousMonthBudgets={hasPreviousMonthBudgets}
            totalPlannedIncome={totalPlannedIncome}
            totalActualIncome={totalActualIncome}
            onEditBudget={handleEditBudget}
            onDeleteBudget={handleDeleteBudget}
            onDeleteMonth={async () => {
              const budgetIds = selectedMonthBudgets.map((b) => b.CategoryBudgetID);
              const plannedEntryIds = selectedMonthEntries.map((e) => e.PlannedEntryID);
              await handleDeleteMonth(selectedMonth, selectedYear, budgetIds, plannedEntryIds);
            }}
            onConsolidate={handleConsolidateBudget}
            onConsolidateAll={handleConsolidateAllBudgets}
            onToggleExpand={() => handleToggleMonthExpand(selectedMonth, selectedYear)}
            onCopyFromPreviousMonth={() => handleCopyFromPreviousMonth(selectedMonth, selectedYear)}
            onMatchEntry={(entryId) => handleMatchExpandedEntry(entryId, selectedMonth, selectedYear)}
            onUnmatchEntry={(entryId) => handleUnmatchExpandedEntry(entryId, selectedMonth, selectedYear)}
            onDismissEntry={(entryId, reason) => handleDismissExpandedEntry(entryId, selectedMonth, selectedYear, reason)}
            onUndismissEntry={(entryId) => handleUndismissExpandedEntry(entryId, selectedMonth, selectedYear)}
            onEditEntry={(entry) => handleEditPlannedEntry(entry, selectedMonth, selectedYear)}
            onDeleteEntry={(entryId) => handleDeletePlannedEntry(entryId, selectedMonth, selectedYear)}
            onCategoryCardClick={handleCategoryCardClick}
            hideHeader={true}
          />
        )}

        {/* Create/Edit Budget Modal */}
        <Modal
          isOpen={showCreateBudgetModal}
          onClose={handleCancelBudgetForm}
          title={editingBudget ? 'Editar Orçamento' : 'Criar Orçamento'}
          subtitle={!editingBudget ? `Para ${getMonthName(selectedMonth)} ${selectedYear}` : undefined}
          headerGradient="sage"
          footer={
            <>
              <Modal.CancelButton onClick={handleCancelBudgetForm} disabled={isSubmitting}>
                Cancelar
              </Modal.CancelButton>
              <Modal.SubmitButton
                onClick={editingBudget ? handleUpdateBudget : handleCreateBudget}
                disabled={isSubmitting}
                loading={isSubmitting}
                loadingText="Salvando..."
                variant="sage"
              >
                {editingBudget ? 'Atualizar' : 'Criar'}
              </Modal.SubmitButton>
            </>
          }
        >
          <div className="space-y-4">
            {/* Category Dropdown */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Categoria *
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={!!editingBudget || isSubmitting}
                className="input disabled:bg-stone-100"
              >
                <option value="">Selecione uma categoria</option>
                {categories?.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Type */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Tipo de Orçamento *
              </label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as any)}
                disabled={isSubmitting}
                className="input"
              >
                <option value="fixed">Fixo</option>
                <option value="calculated">Calculado</option>
                <option value="maior">Maior</option>
              </select>
            </div>

            {/* Planned Amount */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Valor Planejado {budgetType === 'fixed' ? '*' : '(Opcional)'}
              </label>
              {budgetType !== 'fixed' && (
                <p className="text-xs text-stone-500 mb-2">
                  💡 Para orçamentos calculados, o valor será calculado automaticamente a partir das entradas planejadas
                </p>
              )}
              <div className="relative">
                <span className="absolute left-3 top-2 text-stone-500">R$</span>
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
                  placeholder={budgetType === 'fixed' ? '0.00' : '0.00 (será calculado)'}
                  className="input pl-10"
                />
              </div>
            </div>
          </div>
        </Modal>

        {/* Create/Edit Planned Entry Modal */}
        <Modal
          isOpen={showCreateEntryModal}
          onClose={() => {
            setShowCreateEntryModal(false);
            setEditingEntry(null);
            setSelectedEntryMonth(null);
          }}
          title={editingEntry ? 'Editar Entrada Planejada' : 'Criar Entrada Planejada'}
          subtitle={!editingEntry ? `Para ${getMonthName(selectedMonth)} ${selectedYear}` : undefined}
          headerGradient="wheat"
          size="lg"
        >
          <PlannedEntryForm
            categories={categories}
            savingsGoals={savingsGoals}
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
        </Modal>

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

        {/* Category Transactions Modal */}
        {showCategoryTransactionsModal && selectedCategoryForTransactions && (() => {
          const selectedBudget = selectedMonthBudgets.find(b => b.CategoryID === selectedCategoryForTransactions);
          const category = categories.find(c => c.category_id === selectedCategoryForTransactions);
          const categoryEntries = selectedMonthEntries.filter(e => e.CategoryID === selectedCategoryForTransactions);
          const categoriesMap = new Map(categories.map(c => [c.category_id, c]));

          return (
            <CategoryTransactionsModal
              categoryId={selectedCategoryForTransactions}
              categoryName={category?.name || 'Categoria'}
              month={selectedMonth}
              year={selectedYear}
              transactions={allTransactions}
              plannedEntries={categoryEntries}
              categories={categoriesMap}
              actualSpent={selectedMonthSpending[selectedCategoryForTransactions] || '0'}
              plannedAmount={selectedBudget?.PlannedAmount || '0'}
              isIncome={category?.category_type === 'income'}
              onClose={handleCloseCategoryTransactionsModal}
              onTransactionClick={handleTransactionClickInBudget}
              onPlannedEntryClick={handlePlannedEntryClickInBudget}
            />
          );
        })()}

        {/* Transaction Edit Modal (nested from Category Transactions Modal) */}
        {editingTransactionFromBudget && (
          <TransactionEditModal
            transaction={editingTransactionFromBudget}
            categories={new Map(categories.map(c => [c.category_id, c]))}
            onClose={handleCloseTransactionEditModal}
            onSave={handleSaveTransactionFromBudget}
          />
        )}

        {/* Planned Entry Edit Modal (nested from Category Transactions Modal) */}
        <Modal
          isOpen={!!editingPlannedEntryFromBudget}
          onClose={handleClosePlannedEntryEditModal}
          title="Editar Entrada Planejada"
          headerGradient="wheat"
          size="lg"
        >
          {editingPlannedEntryFromBudget && (
            <PlannedEntryForm
              categories={categories}
              savingsGoals={savingsGoals}
              onSubmit={handleSavePlannedEntryFromBudget}
              onCancel={handleClosePlannedEntryEditModal}
              initialEntry={{
                PlannedEntryID: editingPlannedEntryFromBudget.PlannedEntryID,
                UserID: 0,
                OrganizationID: 0,
                CategoryID: editingPlannedEntryFromBudget.CategoryID,
                Description: editingPlannedEntryFromBudget.Description,
                Amount: editingPlannedEntryFromBudget.Amount,
                AmountMin: editingPlannedEntryFromBudget.AmountMin,
                AmountMax: editingPlannedEntryFromBudget.AmountMax,
                ExpectedDay: editingPlannedEntryFromBudget.ExpectedDay,
                ExpectedDayStart: editingPlannedEntryFromBudget.ExpectedDayStart,
                ExpectedDayEnd: editingPlannedEntryFromBudget.ExpectedDayEnd,
                EntryType: editingPlannedEntryFromBudget.EntryType,
                IsRecurrent: editingPlannedEntryFromBudget.IsRecurrent,
                IsSavedPattern: false,
                IsActive: true,
                ParentEntryID: editingPlannedEntryFromBudget.ParentEntryID,
                PatternID: editingPlannedEntryFromBudget.PatternID,
                CreatedAt: '',
                UpdatedAt: '',
              }}
              isLoading={isSubmitting}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}
