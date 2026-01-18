import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';

interface CategoryPacing {
  category_id: number;
  category_name: string;
  category_icon: string;
  budget: string;
  spent: string;
  expected: string;
  variance: string;
  status: 'under_pace' | 'on_pace' | 'over_pace' | 'no_budget';
}

interface PacingData {
  month: number;
  year: number;
  current_day: number;
  days_in_month: number;
  progress_percentage: number;
  categories: CategoryPacing[];
}

interface BudgetPacingWidgetProps {
  month?: number;
  year?: number;
}

export default function BudgetPacingWidget({ month, year }: BudgetPacingWidgetProps) {
  const { token } = useAuth();
  const [pacingData, setPacingData] = useState<PacingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPacingData();
  }, [token, month, year]);

  const fetchPacingData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());

      const response = await fetch(`${financialUrl('budgets/categories/pacing')}${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pacing data');
      }

      const result = await response.json();
      setPacingData(result.data);
    } catch (err) {
      console.error('Failed to fetch pacing data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numAmount);
  };

  const getStatusConfig = (status: CategoryPacing['status']) => {
    switch (status) {
      case 'under_pace':
        return {
          icon: '✓',
          label: 'Abaixo do ritmo',
          bgClass: 'bg-sage-50',
          borderClass: 'border-sage-200',
          textClass: 'text-sage-700',
          dotClass: 'bg-sage-500',
        };
      case 'on_pace':
        return {
          icon: '⚖️',
          label: 'No ritmo',
          bgClass: 'bg-wheat-50',
          borderClass: 'border-wheat-200',
          textClass: 'text-wheat-700',
          dotClass: 'bg-wheat-500',
        };
      case 'over_pace':
        return {
          icon: '⚠',
          label: 'Acima do ritmo',
          bgClass: 'bg-rust-50',
          borderClass: 'border-rust-200',
          textClass: 'text-rust-700',
          dotClass: 'bg-rust-500',
        };
      case 'no_budget':
        return {
          icon: '📋',
          label: 'Sem orçamento',
          bgClass: 'bg-stone-50',
          borderClass: 'border-stone-200',
          textClass: 'text-stone-600',
          dotClass: 'bg-stone-400',
        };
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 border-2 border-wheat-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-stone-500 text-sm">Carregando pacing...</span>
        </div>
      </div>
    );
  }

  if (error || !pacingData) {
    return null; // Silently hide on error
  }

  // Only show if there are controllable categories
  if (pacingData.categories.length === 0) {
    return null;
  }

  const isCurrentMonth = () => {
    const now = new Date();
    return pacingData.month === now.getMonth() + 1 && pacingData.year === now.getFullYear();
  };

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <span>🎯</span> Ritmo de Gastos Controlados
          </h2>
          {isCurrentMonth() && (
            <p className="text-xs text-stone-500 mt-1">
              Dia {pacingData.current_day} de {pacingData.days_in_month} ({pacingData.progress_percentage.toFixed(0)}% do mês)
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {pacingData.categories.map((category) => {
          const config = getStatusConfig(category.status);
          const spent = parseFloat(category.spent);
          const expected = parseFloat(category.expected);
          const budget = parseFloat(category.budget);
          const variance = parseFloat(category.variance);

          // Calculate progress percentage for the bar
          const spentPercent = budget > 0 ? (spent / budget) * 100 : 0;
          const expectedPercent = budget > 0 ? (expected / budget) * 100 : 0;

          return (
            <div
              key={category.category_id}
              className={`p-3 rounded-xl border ${config.borderClass} ${config.bgClass}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{category.category_icon}</span>
                  <div>
                    <p className="text-sm font-medium text-stone-900">{category.category_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${config.bgClass} ${config.textClass}`}>
                        {config.icon} {config.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-stone-900 tabular-nums">
                    {formatCurrency(spent)}
                  </p>
                  <p className="text-xs text-stone-500">
                    de {formatCurrency(budget)}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2">
                <div className="h-2 bg-stone-200 rounded-full relative overflow-hidden">
                  {/* Spent amount bar */}
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${
                      category.status === 'over_pace' ? 'bg-rust-400' :
                      category.status === 'under_pace' ? 'bg-sage-400' :
                      'bg-wheat-400'
                    }`}
                    style={{ width: `${Math.min(100, spentPercent)}%` }}
                  />
                  {/* Expected amount marker */}
                  {isCurrentMonth() && expectedPercent > 0 && (
                    <div
                      className="absolute top-0 w-0.5 h-2 bg-stone-700 opacity-60"
                      style={{ left: `${Math.min(100, expectedPercent)}%` }}
                      title={`Esperado: ${formatCurrency(expected)}`}
                    />
                  )}
                </div>

                {/* Variance info */}
                {isCurrentMonth() && category.status !== 'no_budget' && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-stone-500">
                      Esperado: {formatCurrency(expected)}
                    </p>
                    <p className={`text-xs font-medium ${config.textClass}`}>
                      {variance > 0 ? '+' : ''}{formatCurrency(variance)} {variance > 0 ? 'acima' : 'abaixo'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-stone-200">
        <p className="text-xs text-stone-500 text-center">
          💡 Categorias controláveis ajudam você a manter gastos no ritmo esperado
        </p>
      </div>
    </div>
  );
}
