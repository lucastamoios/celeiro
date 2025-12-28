import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import type { Transaction } from '../types/transaction';
import type { Category } from '../types/category';

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

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  uncategorizedCount: number;
  month: number;
  year: number;
  categoryExpenses: CategoryExpense[];
}

interface DashboardProps {
  onNavigateToUncategorized: () => void;
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

      // Get current month/year from transactions (use the most recent transaction's month)
      // This way we show stats for the month that has transactions
      let targetMonth = new Date().getMonth();
      let targetYear = new Date().getFullYear();
      
      if (allTransactions.length > 0) {
        // Sort by date descending to get most recent
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
        .sort((a, b) => b.amount - a.amount) // Sort by amount descending
        .slice(0, 8); // Top 8 categories

      // Fetch uncategorized count (filtered by current month)
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
        // Filter by the selected month/year
        const filteredUncategorized = allUncategorized.filter((tx: { transaction_date: string }) => {
          const txDate = new Date(tx.transaction_date);
          return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
        });
        uncategorizedCount = filteredUncategorized.length;
      }

      setStats({
        totalIncome: income,
        totalExpenses: expenses,
        balance: income - expenses,
        uncategorizedCount,
        month: targetMonth,
        year: targetYear,
        categoryExpenses,
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

  const getBalanceColor = () => {
    if (stats.balance > 0) return 'text-emerald-600';
    if (stats.balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getBalanceIcon = () => {
    if (stats.balance > 0) return '📈';
    if (stats.balance < 0) return '📉';
    return '➖';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard 📊
          </h1>
          <p className="text-gray-600">
            Visão geral das suas finanças em {new Date(stats.year, stats.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Income Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                💰
              </div>
              <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Receitas
              </span>
            </div>
            <div className="text-3xl font-bold text-emerald-600 mb-1">
              {formatCurrency(stats.totalIncome)}
            </div>
            <p className="text-sm text-gray-500">Total recebido este mês</p>
          </div>

          {/* Expenses Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-red-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">
                💸
              </div>
              <span className="text-sm font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
                Despesas
              </span>
            </div>
            <div className="text-3xl font-bold text-red-600 mb-1">
              {formatCurrency(stats.totalExpenses)}
            </div>
            <p className="text-sm text-gray-500">Total gasto este mês</p>
          </div>

          {/* Balance Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                {getBalanceIcon()}
              </div>
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Saldo
              </span>
            </div>
            <div className={`text-3xl font-bold mb-1 ${getBalanceColor()}`}>
              {formatCurrency(stats.balance)}
            </div>
            <p className="text-sm text-gray-500">Diferença entre receitas e despesas</p>
          </div>
        </div>

        {/* Category Expenses Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Gastos por Categoria</h2>
          
          {stats.categoryExpenses.length > 0 ? (
            <div className="space-y-4">
              {stats.categoryExpenses.map(({ category, amount, percentage }) => {
                const hexColor = category.color || '#6B7280';
                const r = parseInt(hexColor.slice(1, 3), 16);
                const g = parseInt(hexColor.slice(3, 5), 16);
                const b = parseInt(hexColor.slice(5, 7), 16);
                
                return (
                  <div key={category.category_id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ 
                            backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
                            borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
                            borderWidth: '2px',
                            borderStyle: 'solid',
                          }}
                        >
                          {category.icon || '📦'}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{category.name}</span>
                          <div className="text-xs text-gray-500">{percentage.toFixed(1)}% do total</div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: hexColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500 text-sm">
                Nenhuma despesa categorizada este mês
              </p>
            </div>
          )}
        </div>

        {/* Uncategorized Transactions Alert */}
        {stats.uncategorizedCount > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                ⚠️
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 mb-2">
                  Transações Pendentes de Classificação
                </h3>
                <p className="text-amber-800 mb-4">
                  Você tem <span className="font-bold">{stats.uncategorizedCount} {stats.uncategorizedCount === 1 ? 'transação' : 'transações'}</span> neste mês aguardando classificação.
                  Categorize suas transações para ter uma visão mais precisa das suas finanças.
                </p>
                <button
                  onClick={onNavigateToUncategorized}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Categorizar Agora
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All categorized message */}
        {stats.uncategorizedCount === 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-900 mb-1">
                  Tudo Organizado!
                </h3>
                <p className="text-emerald-800">
                  Todas as suas transações estão devidamente categorizadas.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

