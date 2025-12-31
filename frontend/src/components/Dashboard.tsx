import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import { getCategoryBudgets, getPlannedEntriesForMonth } from '../api/budget';
import { getStatusIndicator, getProgressBarClasses } from '../utils/colors';
import type { Transaction } from '../types/transaction';
import type { Category } from '../types/category';
import type { PlannedEntryWithStatus } from '../types/budget';

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
function getBudgetStatus(totalActual: number, totalPlanned: number): {
  status: 'on-track' | 'warning' | 'over-budget';
  message: string;
  icon: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  if (totalPlanned === 0) {
    return {
      status: 'on-track',
      message: 'Configure seu orçamento',
      icon: '📋',
      bgClass: 'bg-stone-50',
      textClass: 'text-stone-600',
      borderClass: 'border-stone-200',
    };
  }

  const percentSpent = (totalActual / totalPlanned) * 100;

  if (percentSpent > 100) {
    return {
      status: 'over-budget',
      message: 'Orçamento excedido',
      icon: '⚠️',
      bgClass: 'bg-rust-50',
      textClass: 'text-rust-700',
      borderClass: 'border-rust-200',
    };
  }
  if (percentSpent >= 80) {
    return {
      status: 'warning',
      message: 'Atenção ao orçamento',
      icon: '📊',
      bgClass: 'bg-terra-50',
      textClass: 'text-terra-700',
      borderClass: 'border-terra-200',
    };
  }
  return {
    status: 'on-track',
    message: 'Você está no caminho certo!',
    icon: '✓',
    bgClass: 'bg-sage-50',
    textClass: 'text-sage-700',
    borderClass: 'border-sage-200',
  };
}

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
          new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        );
        const mostRecentDate = new Date(sortedTx[0].transaction_date);
        targetMonth = mostRecentDate.getMonth();
        targetYear = mostRecentDate.getFullYear();
      }

      const firstDay = new Date(targetYear, targetMonth, 1);
      const lastDay = new Date(targetYear, targetMonth + 1, 0);

      // Filter current month transactions (excluding ignored ones)
      const currentMonthTx = allTransactions.filter(tx => {
        const txDate = new Date(tx.transaction_date);
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
          const txDate = new Date(tx.transaction_date);
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

          for (const budget of categoryBudgets) {
            const planned = parseFloat(budget.PlannedAmount) || 0;
            totalPlanned += planned;

            const categoryData = categoryMap.get(budget.CategoryID);
            const actual = categoryData ? categoryData.amount : 0;
            totalActual += actual;

            const category = categories.find(c => c.category_id === budget.CategoryID);
            if (category) {
              budgetsByCategory.push({ category, planned, actual });
            }
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

  // Calculate budget status for hero card
  const budgetStatus = getBudgetStatus(
    stats.budgetSummary?.totalActual || 0,
    stats.budgetSummary?.totalPlanned || 0
  );

  const percentSpent = stats.budgetSummary && stats.budgetSummary.totalPlanned > 0
    ? Math.round((stats.budgetSummary.totalActual / stats.budgetSummary.totalPlanned) * 100)
    : 0;

  const available = stats.budgetSummary
    ? stats.budgetSummary.totalPlanned - stats.budgetSummary.totalActual
    : 0;

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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-stone-500 text-sm">
          {new Date(stats.year, stats.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Hero Status Card */}
      <div className={`card mb-8 ${budgetStatus.borderClass} border-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 ${budgetStatus.bgClass} rounded-xl flex items-center justify-center text-2xl`}>
              {budgetStatus.icon}
            </div>
            <div>
              <p className={`text-sm font-medium ${budgetStatus.textClass}`}>
                {budgetStatus.message}
              </p>
              <p className="text-stone-900 currency-hero">
                {formatCurrency(Math.abs(available))}
                <span className="text-stone-500 text-lg font-normal ml-2">
                  {available >= 0 ? 'disponível' : 'acima do limite'}
                </span>
              </p>
            </div>
          </div>

          {stats.budgetSummary && (
            <div className="text-right">
              <p className="text-stone-500 text-sm">
                {formatCurrency(stats.budgetSummary.totalActual)} de {formatCurrency(stats.budgetSummary.totalPlanned)}
              </p>
              <p className={`text-lg font-bold ${budgetStatus.textClass}`}>
                {percentSpent}% usado
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {stats.budgetSummary && (
          <div className="mt-6">
            <div className="progress-bar h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getProgressBarClasses(percentSpent)}`}
                style={{ width: `${Math.min(100, percentSpent)}%` }}
              />
            </div>
          </div>
        )}
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
              <span className="text-lg">💰</span>
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
              <span className="text-lg">💸</span>
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
              <span className="text-lg">{stats.balance >= 0 ? '📈' : '📉'}</span>
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

      {/* Category Expenses */}
      {stats.categoryExpenses.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Gastos por Categoria
          </h2>

          <div className="space-y-4">
            {stats.categoryExpenses.map(({ category, amount, percentage }) => {
              const budget = stats.budgetSummary?.budgetsByCategory.find(
                b => b.category.category_id === category.category_id
              );
              const budgetPercent = budget && budget.planned > 0
                ? (amount / budget.planned) * 100
                : 0;
              const statusIndicator = budget ? getStatusIndicator(budgetPercent) : null;

              return (
                <div key={category.category_id} className="flex items-center gap-4">
                  {/* Status indicator */}
                  {statusIndicator && (
                    <div className={`status-indicator ${statusIndicator.bgClass} ${statusIndicator.colorClass}`}>
                      {statusIndicator.icon}
                    </div>
                  )}

                  {/* Category info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">{category.icon || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-stone-900 truncate">
                          {category.name}
                        </span>
                        <span className="text-sm font-bold text-stone-900 tabular-nums ml-2">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            statusIndicator ? getProgressBarClasses(budgetPercent) : 'bg-stone-400'
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-stone-500">
                          {percentage.toFixed(1)}% do total
                        </span>
                        {budget && (
                          <span className="text-xs text-stone-500">
                            de {formatCurrency(budget.planned)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
