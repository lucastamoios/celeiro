import { useEffect, useState, useCallback } from 'react';
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

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateBudgetModal) {
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
  }, [showCreateBudgetModal, showCreateEntryModal, showMatchModal]);

  // Handle backdrop click for modals
  const handleBudgetModalBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowCreateBudgetModal(false);
      setEditingBudget(null);
    }
  }, []);

  const handleEntryModalBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowCreateEntryModal(false);
      setEditingEntry(null);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchAllData();
  }, [token]);

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
          { token, organizationId: '1' }
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
          getPlannedEntriesForMonth(month, year, { token, organizationId: '1' })
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

        const txDate = new Date(tx.transaction_date);
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
        return deleteCategoryBudget(id, { token, organizationId: '1' })
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
        return dismissPlannedEntry(id, { month, year }, { token, organizationId: '1' })
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
      await copyCategoryBudgetsFromMonth(
        {
          source_month: sourceMonth,
          source_year: sourceYear,
          target_month: targetMonth,
          target_year: targetYear,
        },
        { token, organizationId: '1' }
      );

      setSuccessMessage('Orçamentos copiados com sucesso!');
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
        organizationId: '1',
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
        organizationId: '1',
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
          organizationId: '1',
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
              .map(({ month, year, budgets, isConsolidated }, index, arr) => {
                const isCurrent = month === currentMonth && year === currentYear;
                const key = `${month}-${year}`;
                const isExpanded = expandedMonths.has(key);
                const entries = expandedMonthEntries[key] || [];
                const entriesLoading = expandedMonthLoading[key] || false;

                // Check if previous month has budgets (for copy button)
                // Previous month in the reversed array is actually next index
                const prevMonthData = arr[index + 1];
                const hasPreviousMonthBudgets = prevMonthData ? prevMonthData.budgets.length > 0 : false;

                // Get spending for this specific month
                const monthKey = `${month}-${year}`;
                const monthSpending = actualSpending[monthKey] || {};

                return (
                  <MonthlyBudgetCard
                    key={`${year}-${month}`}
                    month={month}
                    year={year}
                    budgets={budgets}
                    categories={categories}
                    actualSpending={monthSpending}
                    isCurrent={isCurrent}
                    isConsolidated={isConsolidated}
                    isExpanded={isExpanded}
                    plannedEntries={entries}
                    plannedEntriesLoading={entriesLoading}
                    hasPreviousMonthBudgets={hasPreviousMonthBudgets}
                    onEditBudget={handleEditBudget}
                    onDeleteBudget={handleDeleteBudget}
                    onDeleteMonth={async () => {
                      const budgetIds = budgets.map((b) => b.CategoryBudgetID);
                      const plannedEntryIds = entries.map((e) => e.PlannedEntryID);
                      await handleDeleteMonth(month, year, budgetIds, plannedEntryIds);
                    }}
                    onConsolidate={handleConsolidateBudget}
                    onToggleExpand={() => handleToggleMonthExpand(month, year)}
                    onCopyFromPreviousMonth={() => handleCopyFromPreviousMonth(month, year)}
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
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleBudgetModalBackdropClick}
          >
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
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleEntryModalBackdropClick}
          >
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
