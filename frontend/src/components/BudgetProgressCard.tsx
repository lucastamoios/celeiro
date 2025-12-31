import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { BudgetProgress } from '../types/budget';
import { getBudgetProgress } from '../api/budget';

interface BudgetProgressCardProps {
  budgetId: number;
}

export default function BudgetProgressCard({ budgetId }: BudgetProgressCardProps) {
  const { token } = useAuth();
  const [progress, setProgress] = useState<BudgetProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    fetchProgress();
  }, [budgetId, token]);

  const fetchProgress = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getBudgetProgress(budgetId, { token });
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget progress');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(isNaN(num) ? 0 : num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-sage-100 text-sage-800';
      case 'over_budget':
        return 'bg-rust-100 text-rust-800';
      case 'warning':
        return 'bg-terra-100 text-terra-800';
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'On Track';
      case 'over_budget':
        return 'Over Budget';
      case 'warning':
        return 'Warning';
      default:
        return status;
    }
  };

  const getVarianceColor = (variance: string) => {
    const varianceNum = parseFloat(variance);
    if (varianceNum > 0) return 'text-rust-600';
    if (varianceNum < 0) return 'text-sage-600';
    return 'text-stone-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-stone-600">Loading budget progress...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-rust-50 border border-rust-200 rounded-lg p-4">
          <p className="text-rust-800">{error}</p>
          <button
            onClick={fetchProgress}
            className="mt-2 text-rust-600 hover:text-rust-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8 text-stone-600">
          No progress data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-stone-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-stone-900">
            Budget Progress & Forecast
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(progress.status)}`}>
            {getStatusText(progress.status)}
          </span>
        </div>
      </div>

      {/* Main Progress Section */}
      <div className="p-6 space-y-6">
        {/* Month Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-stone-600">Month Progress</span>
            <span className="text-sm font-medium text-stone-900">
              Day {progress.current_day} of {progress.days_in_month}
            </span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-3">
            <div
              className="bg-wheat-500 h-3 rounded-full transition-all"
              style={{ width: `${progress.progress_percentage || 0}%` }}
            ></div>
          </div>
          <div className="text-right text-xs text-stone-500 mt-1">
            {(progress.progress_percentage || 0).toFixed(1)}% elapsed
          </div>
        </div>

        {/* Spending Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expected vs Actual */}
          <div className="bg-stone-50 rounded-lg p-4">
            <div className="text-sm text-stone-600 mb-2">Expected at Day {progress.current_day}</div>
            <div className="text-xl font-bold text-stone-900">
              {formatCurrency(progress.expected_at_current_day)}
            </div>
          </div>

          <div className={`rounded-lg p-4 ${
            progress.status === 'over_budget' ? 'bg-rust-50' : 'bg-wheat-50'
          }`}>
            <div className={`text-sm mb-2 ${
              progress.status === 'over_budget' ? 'text-rust-600' : 'text-wheat-600'
            }`}>
              Actual Spent
            </div>
            <div className={`text-xl font-bold ${
              progress.status === 'over_budget' ? 'text-rust-900' : 'text-wheat-900'
            }`}>
              {formatCurrency(progress.actual_spent)}
            </div>
          </div>

          {/* Variance */}
          <div className="bg-stone-50 rounded-lg p-4">
            <div className="text-sm text-stone-600 mb-2">Variance</div>
            <div className={`text-xl font-bold ${getVarianceColor(progress.variance)}`}>
              {parseFloat(progress.variance) > 0 ? '+' : ''}
              {formatCurrency(progress.variance)}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {parseFloat(progress.variance) > 0 ? 'Over expected' : 'Under expected'}
            </div>
          </div>

          {/* Total Budget */}
          <div className="bg-sage-50 rounded-lg p-4">
            <div className="text-sm text-sage-600 mb-2">Total Budget</div>
            <div className="text-xl font-bold text-sage-900">
              {formatCurrency(progress.total_budget)}
            </div>
          </div>
        </div>

        {/* End of Month Projection */}
        {progress.budget_type === 'fixed' && (
          <div className="border-t border-stone-200 pt-6">
            <h4 className="text-sm font-semibold text-stone-900 mb-4">
              📊 End-of-Month Projection
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-terra-50 rounded-lg p-4">
                <div className="text-sm text-terra-600 mb-2">Projected Total</div>
                <div className="text-xl font-bold text-terra-900">
                  {formatCurrency(progress.projection_end_of_month)}
                </div>
              </div>

              <div className={`rounded-lg p-4 ${
                parseFloat(progress.projected_variance_at_end) > 0 ? 'bg-rust-50' : 'bg-sage-50'
              }`}>
                <div className={`text-sm mb-2 ${
                  parseFloat(progress.projected_variance_at_end) > 0 ? 'text-rust-600' : 'text-sage-600'
                }`}>
                  Projected Variance
                </div>
                <div className={`text-xl font-bold ${
                  parseFloat(progress.projected_variance_at_end) > 0 ? 'text-rust-900' : 'text-sage-900'
                }`}>
                  {parseFloat(progress.projected_variance_at_end) > 0 ? '+' : ''}
                  {formatCurrency(progress.projected_variance_at_end)}
                </div>
                <div className="text-xs mt-1">
                  {parseFloat(progress.projected_variance_at_end) > 0
                    ? 'Projected to exceed budget'
                    : 'Projected to stay within budget'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Breakdown (for calculated budgets) */}
        {progress.categories && progress.categories.length > 0 && (
          <div className="border-t border-stone-200 pt-6">
            <h4 className="text-sm font-semibold text-stone-900 mb-4">
              📂 Category Breakdown
            </h4>
            <div className="space-y-3">
              {progress.categories?.map((category) => (
                <div
                  key={category.category_id}
                  className="bg-stone-50 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-stone-900">
                      {category.category_name}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(category.status)}`}>
                      {getStatusText(category.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-stone-600 text-xs">Planned</div>
                      <div className="font-semibold">
                        {formatCurrency(category.planned_amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-stone-600 text-xs">Spent</div>
                      <div className="font-semibold">
                        {formatCurrency(category.actual_spent)}
                      </div>
                    </div>
                    <div>
                      <div className="text-stone-600 text-xs">Variance</div>
                      <div className={`font-semibold ${getVarianceColor(category.variance)}`}>
                        {parseFloat(category.variance) > 0 ? '+' : ''}
                        {formatCurrency(category.variance)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
