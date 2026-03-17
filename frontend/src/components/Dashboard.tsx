import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, X, ChevronLeft, ChevronRight, CalendarDays, Tags, Upload, PieChart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import { getCategoryBudgets, getPlannedEntriesForMonth } from '../api/budget';
import { parseTransactionDate } from '../utils/date';
import { useSelectedMonth } from '../hooks/useSelectedMonth';
import type { Transaction } from '../types/transaction';
import type { Category } from '../types/category';
import type { PlannedEntryWithStatus } from '../types/budget';
import BudgetPacingWidget from './BudgetPacingWidget';
import { getCategoryColor } from '../utils/colors';

interface Account {
  AccountID: number;
  Name: string;
  BankName: string;
  AccountType: string;
  Currency: string;
  IsActive: boolean;
}

interface CategoryExpense {
  category: Category;
  amount: number;
  percentage: number;
}

interface TagExpense {
  tag: string;
  amount: number;
  percentage: number;
}

interface BudgetSummary {
  totalControlled: number;
  totalPlannedEntries: number;
  totalEstimated: number; // controlled + planned entries
  totalActual: number;
  totalPlannedIncome: number;
  variance: number;
  variancePercent: number;
  budgetsByCategory: {
    category: Category;
    planned: number;
    actual: number;
  }[];
  plannedEntries: {
    total: number;
    matched: number;
    pending: number;
    missed: number;
  };
}

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  uncategorizedCount: number;
  totalTransactions: number;
  month: number;
  year: number;
  categoryExpenses: CategoryExpense[];
  tagExpenses: TagExpense[];
  budgetSummary: BudgetSummary | null;
}

// Calculate budget status for hero card
export default function Dashboard() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const {
    selectedMonth, selectedYear,
    goToPreviousMonth, goToNextMonth, goToCurrentMonth, isCurrentMonth: isCurrentSelectedMonth,
  } = useSelectedMonth();
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    uncategorizedCount: 0,
    totalTransactions: 0,
    month: selectedMonth - 1, // 0-indexed for Date compatibility
    year: selectedYear,
    categoryExpenses: [],
    tagExpenses: [],
    budgetSummary: null,
  });
  const [loading, setLoading] = useState(true);
  const [attentionDismissed, setAttentionDismissed] = useState(false);
  const [dismissedItemsSignature, setDismissedItemsSignature] = useState('');

  useEffect(() => {
    fetchStats();
  }, [token, selectedMonth, selectedYear]);

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dashboard_attention_dismissed');
    const signature = localStorage.getItem('dashboard_attention_signature');
    if (dismissed === 'true' && signature) {
      setAttentionDismissed(true);
      setDismissedItemsSignature(signature);
    }
  }, []);

  const fetchStats = async () => {
    if (!token) return;

    try {
      setLoading(true);

      // Fetch accounts and categories in parallel
      const [accountsResponse, categoriesResponse] = await Promise.all([
        fetch(financialUrl('accounts'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        }),
        fetch(financialUrl('categories'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        }),
      ]);

      if (!accountsResponse.ok) throw new Error('Failed to fetch accounts');
      if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');

      const accountsData = await accountsResponse.json();
      const categoriesData = await categoriesResponse.json();
      const accounts: Account[] = accountsData.data || [];
      const categories: Category[] = categoriesData.data || [];

      // Fetch transactions for all accounts
      let allTransactions: Transaction[] = [];
      for (const account of accounts) {
        const txResponse = await fetch(
          financialUrl(`accounts/${account.AccountID}/transactions`),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Active-Organization': '1',
            },
          }
        );

        if (txResponse.ok) {
          const txData = await txResponse.json();
          allTransactions = [...allTransactions, ...(txData.data || [])];
        }
      }

      // Use selected month from shared hook (0-indexed for Date compatibility)
      const targetMonth = selectedMonth - 1;
      const targetYear = selectedYear;

      const firstDay = new Date(targetYear, targetMonth, 1);
      const lastDay = new Date(targetYear, targetMonth + 1, 0);

      // Filter current month transactions (excluding ignored ones)
      const currentMonthTx = allTransactions.filter(tx => {
        // Parse as local time to avoid timezone shift
        const txDate = parseTransactionDate(tx.transaction_date);
        return txDate >= firstDay && txDate <= lastDay && !tx.is_ignored;
      });

      // Calculate stats
      const income = currentMonthTx
        .filter(tx => tx.transaction_type === 'credit')
        .reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);

      const expenses = currentMonthTx
        .filter(tx => tx.transaction_type === 'debit')
        .reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);

      // Calculate expenses by category
      const categoryMap = new Map<number, { category: Category; amount: number }>();

      currentMonthTx
        .filter(tx => tx.transaction_type === 'debit' && tx.category_id)
        .forEach(tx => {
          const categoryId = tx.category_id!;
          const amount = parseFloat(tx.amount.toString());

          if (categoryMap.has(categoryId)) {
            categoryMap.get(categoryId)!.amount += amount;
          } else {
            const category = categories.find(c => c.category_id === categoryId);
            if (category) {
              categoryMap.set(categoryId, { category, amount });
            }
          }
        });

      // Convert to array and calculate percentages
      const categoryExpenses: CategoryExpense[] = Array.from(categoryMap.values())
        .map(({ category, amount }) => ({
          category,
          amount,
          percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8);

      // Calculate expenses by tag
      const tagMap = new Map<string, number>();

      currentMonthTx
        .filter(tx => tx.transaction_type === 'debit' && tx.tags && tx.tags.length > 0)
        .forEach(tx => {
          const amount = parseFloat(tx.amount.toString());
          tx.tags!.forEach(tag => {
            if (tagMap.has(tag)) {
              tagMap.set(tag, tagMap.get(tag)! + amount);
            } else {
              tagMap.set(tag, amount);
            }
          });
        });

      // Convert to array and calculate percentages
      const tagExpenses: TagExpense[] = Array.from(tagMap.entries())
        .map(([tag, amount]) => ({
          tag,
          amount,
          percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Fetch uncategorized count
      const uncatResponse = await fetch(financialUrl('transactions/uncategorized'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
        },
      });

      let uncategorizedCount = 0;
      if (uncatResponse.ok) {
        const uncatData = await uncatResponse.json();
        const allUncategorized = uncatData.data || [];
        const filteredUncategorized = allUncategorized.filter((tx: { transaction_date: string }) => {
          // Parse as local time to avoid timezone shift
          const txDate = parseTransactionDate(tx.transaction_date);
          return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
        });
        uncategorizedCount = filteredUncategorized.length;
      }

      // Fetch budget data for the current month
      let budgetSummary: BudgetSummary | null = null;
      try {
        const [categoryBudgets, plannedEntriesData] = await Promise.all([
          getCategoryBudgets({ month: selectedMonth, year: selectedYear }, { token }),
          getPlannedEntriesForMonth(selectedMonth, selectedYear, { token }),
        ]);

        const budgetsByCategory: BudgetSummary['budgetsByCategory'] = [];
        let totalControlled = 0;
        let totalPlannedEntries = 0;
        let totalActual = 0;
        let totalPlannedIncome = 0;

        // Process category budgets if available
        if (categoryBudgets && categoryBudgets.length > 0) {
          for (const budget of categoryBudgets) {
            const category = categories.find(c => c.category_id === budget.CategoryID);
            if (!category) continue;

            const controlled = parseFloat(budget.ControlledAmount) || 0;
            const categoryData = categoryMap.get(budget.CategoryID);
            const actual = categoryData ? categoryData.amount : 0;

            if (category.category_type === 'expense') {
              totalControlled += controlled;
              totalActual += actual;
            } else if (category.category_type === 'income') {
              totalPlannedIncome += controlled;
            }

            budgetsByCategory.push({ category, planned: controlled, actual });
          }
        }

        // Sum planned entries by type
        const plannedEntriesStats = {
          total: plannedEntriesData?.length || 0,
          matched: plannedEntriesData?.filter((e: PlannedEntryWithStatus) => e.Status === 'matched').length || 0,
          pending: plannedEntriesData?.filter((e: PlannedEntryWithStatus) => e.Status === 'pending').length || 0,
          missed: plannedEntriesData?.filter((e: PlannedEntryWithStatus) => e.Status === 'missed').length || 0,
        };

        if (plannedEntriesData && plannedEntriesData.length > 0) {
          plannedEntriesData.forEach((e: PlannedEntryWithStatus) => {
            if (e.Status === 'dismissed') return;
            const plannedAmount = parseFloat(e.AmountMax || e.Amount || '0');
            if (e.EntryType === 'income') {
              totalPlannedIncome += plannedAmount;
            } else if (e.EntryType === 'expense') {
              totalPlannedEntries += plannedAmount;
            }
          });
        }

        budgetsByCategory.sort((a, b) => b.planned - a.planned);

        const totalEstimated = totalControlled + totalPlannedEntries;
        const variance = totalEstimated - totalActual;
        const variancePercent = totalEstimated > 0 ? (variance / totalEstimated) * 100 : 0;

        budgetSummary = {
          totalControlled,
          totalPlannedEntries,
          totalEstimated,
          totalActual,
          totalPlannedIncome,
          variance,
          variancePercent,
          budgetsByCategory: budgetsByCategory.slice(0, 5),
          plannedEntries: plannedEntriesStats,
        };
      } catch (budgetErr) {
        console.warn('Failed to fetch budget data:', budgetErr);
      }

      setStats({
        totalIncome: income,
        totalExpenses: expenses,
        balance: income - expenses,
        uncategorizedCount,
        totalTransactions: allTransactions.length,
        month: targetMonth,
        year: targetYear,
        categoryExpenses,
        tagExpenses,
        budgetSummary,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-wheat-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-stone-500 text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  const percentSpent = stats.budgetSummary && stats.budgetSummary.totalEstimated > 0
    ? Math.round((stats.budgetSummary.totalActual / stats.budgetSummary.totalEstimated) * 100)
    : 0;

  // Calculate day progress for the current month marker
  const now = new Date();
  const isCurrentMonth = isCurrentSelectedMonth;
  const currentDay = now.getDate();
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dayProgressPercent = isCurrentMonth ? (currentDay / daysInMonth) * 100 : 100;

  // Calculate spending pace
  const expectedSpentByNow = stats.budgetSummary
    ? (stats.budgetSummary.totalEstimated * dayProgressPercent) / 100
    : 0;
  const spendingPace = expectedSpentByNow > 0 && stats.budgetSummary
    ? ((stats.budgetSummary.totalActual - expectedSpentByNow) / expectedSpentByNow) * 100
    : 0;
  const isAheadOfPace = stats.budgetSummary ? stats.budgetSummary.totalActual > expectedSpentByNow : false;

  // Check if planned expenses exceed planned income
  const plannedExpensesExceedIncome = stats.budgetSummary &&
    stats.budgetSummary.totalPlannedIncome > 0 &&
    stats.budgetSummary.totalEstimated > stats.budgetSummary.totalPlannedIncome;

  // Check if there are attention items
  const hasAttentionItems = stats.uncategorizedCount > 0 ||
    (stats.budgetSummary?.plannedEntries.missed || 0) > 0 ||
    plannedExpensesExceedIncome ||
    stats.categoryExpenses.some(ce => {
      const budget = stats.budgetSummary?.budgetsByCategory.find(
        b => b.category.category_id === ce.category.category_id
      );
      return budget && ce.amount > budget.planned;
    });

  // Create a signature of current attention items to detect new ones
  const overBudgetCount = stats.categoryExpenses.filter(ce => {
    const budget = stats.budgetSummary?.budgetsByCategory.find(
      b => b.category.category_id === ce.category.category_id
    );
    return budget && ce.amount > budget.planned;
  }).length;

  const currentItemsSignature = `${stats.uncategorizedCount}-${stats.budgetSummary?.plannedEntries.missed || 0}-${overBudgetCount}-${plannedExpensesExceedIncome ? '1' : '0'}`;

  // Check if we should show attention (has items AND (not dismissed OR new items appeared))
  const shouldShowAttention = hasAttentionItems && (!attentionDismissed || currentItemsSignature !== dismissedItemsSignature);

  const handleDismissAttention = () => {
    setAttentionDismissed(true);
    setDismissedItemsSignature(currentItemsSignature);
    localStorage.setItem('dashboard_attention_dismissed', 'true');
    localStorage.setItem('dashboard_attention_signature', currentItemsSignature);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
      {/* Month Navigation Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-stone-700 font-medium capitalize min-w-[160px] text-center">
            {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={goToNextMonth}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="Proximo mes"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {!isCurrentMonth && (
          <button
            onClick={goToCurrentMonth}
            className="flex items-center gap-1.5 text-sm text-wheat-700 hover:text-wheat-800 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Mes atual
          </button>
        )}
      </div>

      {/* New User Onboarding */}
      {!loading && stats.totalTransactions === 0 && (
        <div className="card border-wheat-200 border-2 bg-wheat-50/30 mb-8">
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <img src="/celeiro-wheat-v4.svg" alt="Celeiro" className="w-16 h-16 opacity-60" />
            </div>
            <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">
              Bem-vindo ao Celeiro
            </h3>
            <p className="text-stone-600 mb-6">
              Organize suas finanças em 3 passos simples
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => navigate('/settings?tab=categorias')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-wheat-300 transition-colors group"
              >
                <div className="w-10 h-10 bg-wheat-100 rounded-lg flex items-center justify-center group-hover:bg-wheat-200 transition-colors">
                  <Tags className="w-5 h-5 text-wheat-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900">1. Crie suas categorias</p>
                  <p className="text-xs text-stone-500">Organize por tipo de gasto</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/transactions')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-wheat-300 transition-colors group"
              >
                <div className="w-10 h-10 bg-wheat-100 rounded-lg flex items-center justify-center group-hover:bg-wheat-200 transition-colors">
                  <Upload className="w-5 h-5 text-wheat-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900">2. Importe seu extrato</p>
                  <p className="text-xs text-stone-500">Arquivo OFX do seu banco</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/budgets')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-wheat-300 transition-colors group"
              >
                <div className="w-10 h-10 bg-wheat-100 rounded-lg flex items-center justify-center group-hover:bg-wheat-200 transition-colors">
                  <PieChart className="w-5 h-5 text-wheat-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900">3. Defina orçamentos</p>
                  <p className="text-xs text-stone-500">Controle seus gastos mensais</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Overview Card */}
      <div className="card mb-8">
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-6">Resumo Financeiro</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Income Section */}
          <div className="p-4 bg-sage-50 rounded-xl border border-sage-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-sage-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-sage-600" />
              </div>
              <div>
                <p className="text-xs text-sage-600 uppercase tracking-wide font-medium">Receitas</p>
                <p className="text-2xl font-bold text-sage-700 tabular-nums">
                  {formatCurrency(stats.totalIncome)}
                </p>
              </div>
            </div>
            {stats.budgetSummary && stats.budgetSummary.totalPlannedIncome > 0 && (
              <div className="pt-3 border-t border-sage-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sage-600">Esperado:</span>
                  <span className="font-semibold text-sage-700 tabular-nums">
                    {formatCurrency(stats.budgetSummary.totalPlannedIncome)}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-sage-200 rounded-full relative overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        stats.totalIncome >= stats.budgetSummary.totalPlannedIncome ? 'bg-sage-500' : 'bg-terra-500'
                      }`}
                      style={{ width: `${Math.min(100, (stats.totalIncome / stats.budgetSummary.totalPlannedIncome) * 100)}%` }}
                    />
                    {isCurrentMonth && (
                      <div
                        className="absolute top-0 w-0.5 h-2 bg-stone-900 opacity-60"
                        style={{ left: `${dayProgressPercent}%` }}
                        title={`Dia ${currentDay} de ${daysInMonth}`}
                      />
                    )}
                  </div>
                  <p className="text-xs text-sage-600 mt-1">
                    {Math.min(100, Math.round((stats.totalIncome / stats.budgetSummary.totalPlannedIncome) * 100))}% recebido
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Expenses Section */}
          <div className="p-4 bg-rust-50 rounded-xl border border-rust-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-rust-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-rust-600" />
              </div>
              <div>
                <p className="text-xs text-rust-600 uppercase tracking-wide font-medium">Despesas</p>
                <p className="text-2xl font-bold text-rust-700 tabular-nums">
                  {formatCurrency(stats.totalExpenses)}
                </p>
              </div>
            </div>
            {stats.budgetSummary && stats.budgetSummary.totalEstimated > 0 && (
              <div className="pt-3 border-t border-rust-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-rust-600">Estimado:</span>
                  <span className="font-semibold text-rust-700 tabular-nums">
                    {formatCurrency(stats.budgetSummary.totalEstimated)}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-rust-200 rounded-full relative overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        percentSpent > 100 ? 'bg-rust-600' : percentSpent > 80 ? 'bg-terra-500' : 'bg-sage-500'
                      }`}
                      style={{ width: `${Math.min(100, percentSpent)}%` }}
                    />
                    {isCurrentMonth && (
                      <div
                        className="absolute top-0 w-0.5 h-2 bg-stone-900 opacity-60"
                        style={{ left: `${dayProgressPercent}%` }}
                        title={`Dia ${currentDay} de ${daysInMonth}`}
                      />
                    )}
                  </div>
                  <p className="text-xs text-rust-600 mt-1">
                    {percentSpent}% usado
                    {isCurrentMonth && Math.abs(spendingPace) > 1 && (
                      <span className={isAheadOfPace ? ' text-rust-600' : ' text-sage-600'}>
                        {' '}({isAheadOfPace
                          ? `${Math.abs(Math.round(spendingPace))}% acima do ritmo`
                          : `${Math.abs(Math.round(spendingPace))}% abaixo`})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Planned Section */}
          <div className="p-4 bg-wheat-50 rounded-xl border border-wheat-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-wheat-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-wheat-600" />
              </div>
              <div>
                <p className="text-xs text-wheat-600 uppercase tracking-wide font-medium">Planejado</p>
                <p className="text-2xl font-bold text-wheat-700 tabular-nums">
                  {formatCurrency(stats.budgetSummary?.totalPlannedEntries || 0)}
                </p>
              </div>
            </div>
            {stats.budgetSummary && stats.budgetSummary.plannedEntries.total > 0 && (
              <div className="pt-3 border-t border-wheat-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-wheat-600">Entradas:</span>
                  <span className="font-semibold text-wheat-700">
                    {stats.budgetSummary.plannedEntries.total}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  {stats.budgetSummary.plannedEntries.matched > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sage-500" />
                      {stats.budgetSummary.plannedEntries.matched}
                    </span>
                  )}
                  {stats.budgetSummary.plannedEntries.pending > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-terra-500" />
                      {stats.budgetSummary.plannedEntries.pending}
                    </span>
                  )}
                  {stats.budgetSummary.plannedEntries.missed > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rust-500" />
                      {stats.budgetSummary.plannedEntries.missed}
                    </span>
                  )}
                </div>
                {stats.budgetSummary.totalControlled > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-wheat-200">
                    <span className="text-wheat-600">Controlado:</span>
                    <span className="font-semibold text-wheat-700 tabular-nums">
                      {formatCurrency(stats.budgetSummary.totalControlled)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="mt-6 pt-6 border-t border-stone-200">
          <div className="flex items-center justify-between">
            <span className="text-stone-600 font-medium">Saldo do Mês:</span>
            <span className={`text-2xl font-bold tabular-nums ${
              stats.balance >= 0 ? 'text-sage-600' : 'text-rust-600'
            }`}>
              {formatCurrency(stats.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Attention Section - Only show if there are items */}
      {shouldShowAttention && (
        <div className="card mb-8 border-terra-200 border-2 bg-terra-50/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-stone-900 flex items-center gap-2">
              <span className="text-terra-500">⚠</span> Requer Atenção
            </h2>
            <button
              onClick={handleDismissAttention}
              className="p-1 hover:bg-terra-100 rounded-lg transition-colors"
              title="Dispensar aviso"
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>

          <div className="space-y-3">
            {stats.uncategorizedCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📋</span>
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {stats.uncategorizedCount} transaç{stats.uncategorizedCount === 1 ? 'ão' : 'ões'} sem categoria
                    </p>
                    <p className="text-xs text-stone-500">Categorize para melhor controle</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/uncategorized')}
                  className="btn-primary text-sm px-3 py-1.5"
                >
                  Categorizar
                </button>
              </div>
            )}

            {(stats.budgetSummary?.plannedEntries.missed || 0) > 0 && (
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {stats.budgetSummary?.plannedEntries.missed} entrada{stats.budgetSummary?.plannedEntries.missed !== 1 ? 's' : ''} planejada{stats.budgetSummary?.plannedEntries.missed !== 1 ? 's' : ''} atrasada{stats.budgetSummary?.plannedEntries.missed !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-stone-500">Verifique as entradas esperadas</p>
                  </div>
                </div>
              </div>
            )}

            {/* Over-budget categories */}
            {stats.categoryExpenses.filter(ce => {
              const budget = stats.budgetSummary?.budgetsByCategory.find(
                b => b.category.category_id === ce.category.category_id
              );
              return budget && ce.amount > budget.planned;
            }).slice(0, 3).map(ce => (
              <div key={ce.category.category_id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{ce.category.icon || '📦'}</span>
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {ce.category.name} acima do limite
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatCurrency(ce.amount)} gasto
                    </p>
                  </div>
                </div>
                <span className="badge-error">Excedido</span>
              </div>
            ))}

            {/* Planned expenses exceed income warning */}
            {plannedExpensesExceedIncome && stats.budgetSummary && (
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚖️</span>
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      Despesas planejadas excedem receitas
                    </p>
                    <p className="text-xs text-stone-500">
                      Estimado: {formatCurrency(stats.budgetSummary.totalEstimated)} despesas vs {formatCurrency(stats.budgetSummary.totalPlannedIncome)} receitas
                    </p>
                  </div>
                </div>
                <span className="badge-warning">Atenção</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Budget Pacing Widget */}
      <BudgetPacingWidget month={selectedMonth} year={selectedYear} />

      {/* Category Expenses */}
      {stats.categoryExpenses.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-stone-900">
              Gastos por Categoria
            </h2>
            <span className="text-sm text-stone-500">
              Total: {formatCurrency(stats.totalExpenses)}
            </span>
          </div>

          <div className="space-y-3">
            {stats.categoryExpenses.map(({ category, amount, percentage }, index) => {
              const color = category.color || getCategoryColor(index);
              const budget = stats.budgetSummary?.budgetsByCategory.find(
                b => b.category.category_id === category.category_id
              );
              const budgetPercent = budget && budget.planned > 0
                ? (amount / budget.planned) * 100
                : 0;
              const hasBudget = budget && budget.planned > 0;

              const expectedByNow = hasBudget
                ? (budget.planned * dayProgressPercent) / 100
                : 0;
              const categoryPacePercent = expectedByNow > 0
                ? ((amount - expectedByNow) / expectedByNow) * 100
                : 0;
              const isCategoryAhead = amount > expectedByNow;

              return (
                <div key={category.category_id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{category.icon || '📦'}</span>
                      <span className="text-sm font-medium text-stone-900 truncate">
                        {category.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="text-sm font-bold text-stone-900 tabular-nums">
                        {formatCurrency(amount)}
                      </span>
                      <span className="text-xs text-stone-400 tabular-nums w-10 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 1)}%`, backgroundColor: color }}
                    />
                  </div>
                  {hasBudget && (
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`text-xs ${
                        isCurrentMonth && isCategoryAhead ? 'text-terra-600' : 'text-stone-500'
                      }`}>
                        {budgetPercent.toFixed(0)}% do orçamento
                        {isCurrentMonth && Math.abs(categoryPacePercent) > 5 && (
                          <span className={isCategoryAhead ? 'text-terra-600' : 'text-sage-600'}>
                            {' '}({isCategoryAhead ? '+' : ''}{categoryPacePercent.toFixed(0)}%)
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-stone-500">
                        de {formatCurrency(budget.planned)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tag Expenses */}
      {stats.tagExpenses.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-stone-900">
              Gastos por Tag
            </h2>
            <span className="text-sm text-stone-500">
              {stats.tagExpenses.length} tags
            </span>
          </div>

          <div className="space-y-3">
            {stats.tagExpenses.map(({ tag, amount, percentage }) => {
              const color = getCategoryColor(tag);

              return (
                <div key={tag}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">🏷️</span>
                      <span className="text-sm font-medium text-stone-900 truncate">
                        {tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="text-sm font-bold text-stone-900 tabular-nums">
                        {formatCurrency(amount)}
                      </span>
                      <span className="text-xs text-stone-400 tabular-nums w-10 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 1)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All organized message */}
      {stats.uncategorizedCount === 0 && !hasAttentionItems && (
        <div className="card border-sage-200 border-2 bg-sage-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-sage-800">
                Tudo Organizado!
              </h3>
              <p className="text-sage-700 text-sm">
                Suas finanças estão em dia. Continue assim!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
