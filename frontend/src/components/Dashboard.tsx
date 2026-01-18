import { useState, useEffect } from 'react';
import { Coins, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import { getCategoryBudgets, getPlannedEntriesForMonth } from '../api/budget';
import { parseTransactionDate } from '../utils/date';
import type { Transaction } from '../types/transaction';
import type { Category } from '../types/category';
import type { PlannedEntryWithStatus } from '../types/budget';
import BudgetPacingWidget from './BudgetPacingWidget';

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

interface BudgetSummary {
  totalPlanned: number;
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
  month: number;
  year: number;
  categoryExpenses: CategoryExpense[];
  budgetSummary: BudgetSummary | null;
}

interface DashboardProps {
  onNavigateToUncategorized: () => void;
}

// Calculate budget status for hero card
export default function Dashboard({ onNavigateToUncategorized }: DashboardProps) {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    uncategorizedCount: 0,
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    categoryExpenses: [],
    budgetSummary: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [token]);

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

      // Get current month/year from transactions
      let targetMonth = new Date().getMonth();
      let targetYear = new Date().getFullYear();

      if (allTransactions.length > 0) {
        const sortedTx = [...allTransactions].sort((a, b) =>
          parseTransactionDate(b.transaction_date).getTime() - parseTransactionDate(a.transaction_date).getTime()
        );
        // Parse as local time to avoid timezone shift
        const mostRecentDate = parseTransactionDate(sortedTx[0].transaction_date);
        targetMonth = mostRecentDate.getMonth();
        targetYear = mostRecentDate.getFullYear();
      }

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
        const apiMonth = targetMonth + 1;

        const [categoryBudgets, plannedEntriesData] = await Promise.all([
          getCategoryBudgets({ month: apiMonth, year: targetYear }, { token }),
          getPlannedEntriesForMonth(apiMonth, targetYear, { token }),
        ]);

        if (categoryBudgets && categoryBudgets.length > 0) {
          const budgetsByCategory: BudgetSummary['budgetsByCategory'] = [];
          let totalPlanned = 0;
          let totalActual = 0;
          let totalPlannedIncome = 0;

          for (const budget of categoryBudgets) {
            const category = categories.find(c => c.category_id === budget.CategoryID);
            if (!category) continue;

            const planned = parseFloat(budget.PlannedAmount) || 0;
            const categoryData = categoryMap.get(budget.CategoryID);
            const actual = categoryData ? categoryData.amount : 0;

            // Only count expense categories for the budget progress bar
            // Income categories should not be mixed with expense budgets
            if (category.category_type === 'expense') {
              totalPlanned += planned;
              totalActual += actual;
            } else if (category.category_type === 'income') {
              totalPlannedIncome += planned;
            }

            budgetsByCategory.push({ category, planned, actual });
          }

          budgetsByCategory.sort((a, b) => b.planned - a.planned);

          const plannedEntriesStats = {
            total: plannedEntriesData?.length || 0,
            matched: plannedEntriesData?.filter((e: PlannedEntryWithStatus) => e.Status === 'matched').length || 0,
            pending: plannedEntriesData?.filter((e: PlannedEntryWithStatus) => e.Status === 'pending').length || 0,
            missed: plannedEntriesData?.filter((e: PlannedEntryWithStatus) => e.Status === 'missed').length || 0,
          };

          const variance = totalPlanned - totalActual;
          const variancePercent = totalPlanned > 0 ? (variance / totalPlanned) * 100 : 0;

          budgetSummary = {
            totalPlanned,
            totalActual,
            totalPlannedIncome,
            variance,
            variancePercent,
            budgetsByCategory: budgetsByCategory.slice(0, 5),
            plannedEntries: plannedEntriesStats,
          };
        }
      } catch (budgetErr) {
        console.warn('Failed to fetch budget data:', budgetErr);
      }

      setStats({
        totalIncome: income,
        totalExpenses: expenses,
        balance: income - expenses,
        uncategorizedCount,
        month: targetMonth,
        year: targetYear,
        categoryExpenses,
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

  const percentSpent = stats.budgetSummary && stats.budgetSummary.totalPlanned > 0
    ? Math.round((stats.budgetSummary.totalActual / stats.budgetSummary.totalPlanned) * 100)
    : 0;

  // Calculate day progress for the current month marker
  const now = new Date();
  const isCurrentMonth = stats.month === now.getMonth() && stats.year === now.getFullYear();
  const currentDay = now.getDate();
  const daysInMonth = new Date(stats.year, stats.month + 1, 0).getDate();
  const dayProgressPercent = (currentDay / daysInMonth) * 100;

  // Calculate spending pace
  const expectedSpentByNow = stats.budgetSummary
    ? (stats.budgetSummary.totalPlanned * dayProgressPercent) / 100
    : 0;
  const spendingPace = expectedSpentByNow > 0 && stats.budgetSummary
    ? ((stats.budgetSummary.totalActual - expectedSpentByNow) / expectedSpentByNow) * 100
    : 0;
  const isAheadOfPace = stats.budgetSummary ? stats.budgetSummary.totalActual > expectedSpentByNow : false;

  // Check if there are attention items
  const hasAttentionItems = stats.uncategorizedCount > 0 ||
    (stats.budgetSummary?.plannedEntries.missed || 0) > 0 ||
    stats.categoryExpenses.some(ce => {
      const budget = stats.budgetSummary?.budgetsByCategory.find(
        b => b.category.category_id === ce.category.category_id
      );
      return budget && ce.amount > budget.planned;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-stone-500 text-sm">
          {new Date(stats.year, stats.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Financial Overview Card */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-6">Resumo Financeiro</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Section */}
          <div className="p-4 bg-sage-50 rounded-xl border border-sage-200">
            <div className="flex items-center gap-3 mb-4">
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
                  <span className="text-sage-600">Planejado:</span>
                  <span className="font-semibold text-sage-700 tabular-nums">
                    {formatCurrency(stats.budgetSummary.totalPlannedIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-sage-600">Diferença:</span>
                  <span className={`font-semibold tabular-nums ${
                    stats.totalIncome >= stats.budgetSummary.totalPlannedIncome ? 'text-sage-700' : 'text-terra-600'
                  }`}>
                    {stats.totalIncome >= stats.budgetSummary.totalPlannedIncome ? '+' : ''}
                    {formatCurrency(stats.totalIncome - stats.budgetSummary.totalPlannedIncome)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Expenses Section */}
          <div className="p-4 bg-rust-50 rounded-xl border border-rust-200">
            <div className="flex items-center gap-3 mb-4">
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
            {stats.budgetSummary && stats.budgetSummary.totalPlanned > 0 && (
              <div className="pt-3 border-t border-rust-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-rust-600">Planejado:</span>
                  <span className="font-semibold text-rust-700 tabular-nums">
                    {formatCurrency(stats.budgetSummary.totalPlanned)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-rust-600">Diferença:</span>
                  <span className={`font-semibold tabular-nums ${
                    stats.totalExpenses <= stats.budgetSummary.totalPlanned ? 'text-sage-700' : 'text-rust-700'
                  }`}>
                    {stats.totalExpenses <= stats.budgetSummary.totalPlanned ? '' : '+'}
                    {formatCurrency(stats.totalExpenses - stats.budgetSummary.totalPlanned)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3">
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
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-rust-600">
                      {percentSpent}% usado
                    </p>
                    {isCurrentMonth && (
                      <p className={`text-xs ${isAheadOfPace ? 'text-rust-600' : 'text-sage-600'}`}>
                        {isAheadOfPace
                          ? `${Math.abs(Math.round(spendingPace))}% acima do ritmo`
                          : `${Math.abs(Math.round(spendingPace))}% abaixo`}
                      </p>
                    )}
                  </div>
                </div>
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
      {hasAttentionItems && (
        <div className="card mb-8 border-terra-200 border-2 bg-terra-50/50">
          <h2 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <span className="text-terra-500">⚠</span> Requer Atenção
          </h2>

          <div className="space-y-3">
            {stats.uncategorizedCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200">
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
                  onClick={onNavigateToUncategorized}
                  className="btn-primary text-sm px-3 py-1.5"
                >
                  Categorizar
                </button>
              </div>
            )}

            {(stats.budgetSummary?.plannedEntries.missed || 0) > 0 && (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200">
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
              <div key={ce.category.category_id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200">
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
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Income */}
        <div className="card-compact">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sage-100 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-sage-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wide">Receitas</p>
              <p className="text-lg font-bold text-sage-600 tabular-nums">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="card-compact">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rust-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-rust-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wide">Despesas</p>
              <p className="text-lg font-bold text-rust-600 tabular-nums">
                {formatCurrency(stats.totalExpenses)}
              </p>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="card-compact">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              stats.balance >= 0 ? 'bg-sage-100' : 'bg-rust-100'
            }`}>
              {stats.balance >= 0 ? (
                <TrendingUp className="w-5 h-5 text-sage-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rust-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wide">Saldo</p>
              <p className={`text-lg font-bold tabular-nums ${
                stats.balance >= 0 ? 'text-sage-600' : 'text-rust-600'
              }`}>
                {formatCurrency(stats.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Pacing Widget */}
      <BudgetPacingWidget month={stats.month + 1} year={stats.year} />

      {/* Category Expenses */}
      {stats.categoryExpenses.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Gastos por Categoria
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full max-w-[280px]">
                {(() => {
                  const colors = [
                    '#8b5a3c', '#d4a574', '#c97d60', '#a68572', '#b8956a',
                    '#9d7a5e', '#c89f7e', '#b07d62', '#a68a76', '#c6906e'
                  ];
                  let currentAngle = -90; // Start at top

                  return stats.categoryExpenses.map(({ category, percentage }, index) => {
                    const sliceAngle = (percentage / 100) * 360;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + sliceAngle;

                    // Calculate path for pie slice
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    const x1 = 100 + 80 * Math.cos(startRad);
                    const y1 = 100 + 80 * Math.sin(startRad);
                    const x2 = 100 + 80 * Math.cos(endRad);
                    const y2 = 100 + 80 * Math.sin(endRad);
                    const largeArc = sliceAngle > 180 ? 1 : 0;

                    const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;

                    currentAngle = endAngle;

                    return (
                      <path
                        key={category.category_id}
                        d={path}
                        fill={colors[index % colors.length]}
                        stroke="white"
                        strokeWidth="2"
                        className="transition-opacity hover:opacity-80 cursor-pointer"
                      />
                    );
                  });
                })()}
                {/* Center hole for donut effect */}
                <circle cx="100" cy="100" r="50" fill="white" />
                <text
                  x="100"
                  y="95"
                  textAnchor="middle"
                  className="text-xs fill-stone-500"
                  style={{ fontSize: '10px' }}
                >
                  Total
                </text>
                <text
                  x="100"
                  y="110"
                  textAnchor="middle"
                  className="text-sm font-bold fill-stone-900"
                  style={{ fontSize: '14px' }}
                >
                  {formatCurrency(stats.totalExpenses)}
                </text>
              </svg>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              {stats.categoryExpenses.map(({ category, amount, percentage }, index) => {
                const colors = [
                  '#8b5a3c', '#d4a574', '#c97d60', '#a68572', '#b8956a',
                  '#9d7a5e', '#c89f7e', '#b07d62', '#a68a76', '#c6906e'
                ];
                const budget = stats.budgetSummary?.budgetsByCategory.find(
                  b => b.category.category_id === category.category_id
                );
                const budgetPercent = budget && budget.planned > 0
                  ? (amount / budget.planned) * 100
                  : 0;
                const hasBudget = budget && budget.planned > 0;

                // For categories with budget, calculate expected spending by now
                const expectedByNow = hasBudget
                  ? (budget.planned * dayProgressPercent) / 100
                  : 0;
                const categoryPacePercent = expectedByNow > 0
                  ? ((amount - expectedByNow) / expectedByNow) * 100
                  : 0;
                const isCategoryAhead = amount > expectedByNow;

                return (
                  <div key={category.category_id} className="flex items-start gap-3">
                    {/* Color indicator */}
                    <div
                      className="w-4 h-4 rounded flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />

                    {/* Category info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">{category.icon || '📦'}</span>
                          <span className="text-sm font-medium text-stone-900 truncate">
                            {category.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-stone-900 tabular-nums ml-2">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        {hasBudget ? (
                          <>
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
                          </>
                        ) : (
                          <span className="text-xs text-stone-500">
                            {percentage.toFixed(1)}% do total
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Planned entries summary */}
          {stats.budgetSummary?.plannedEntries.total ? (
            <div className="mt-6 pt-4 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Entradas planejadas</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sage-500" />
                    {stats.budgetSummary.plannedEntries.matched} recebidas
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-terra-500" />
                    {stats.budgetSummary.plannedEntries.pending} pendentes
                  </span>
                  {stats.budgetSummary.plannedEntries.missed > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rust-500" />
                      {stats.budgetSummary.plannedEntries.missed} atrasadas
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
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
              <h3 className="text-lg font-semibold text-sage-800">
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
