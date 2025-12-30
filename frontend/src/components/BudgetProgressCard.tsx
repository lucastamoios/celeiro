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
        return 'bg-green-100 text-green-800';
      case 'over_budget':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    if (varianceNum > 0) return 'text-red-600';
    if (varianceNum < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-600">Loading budget progress...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchProgress}
            className="mt-2 text-red-600 hover:text-red-700 underline"
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
        <div className="text-center py-8 text-gray-600">
          No progress data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
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
            <span className="text-sm text-gray-600">Month Progress</span>
            <span className="text-sm font-medium text-gray-900">
              Day {progress.current_day} of {progress.days_in_month}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${progress.progress_percentage || 0}%` }}
            ></div>
          </div>
          <div className="text-right text-xs text-gray-500 mt-1">
            {(progress.progress_percentage || 0).toFixed(1)}% elapsed
          </div>
        </div>

        {/* Spending Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expected vs Actual */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Expected at Day {progress.current_day}</div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(progress.expected_at_current_day)}
            </div>
          </div>

          <div className={`rounded-lg p-4 ${
            progress.status === 'over_budget' ? 'bg-red-50' : 'bg-blue-50'
          }`}>
            <div className={`text-sm mb-2 ${
              progress.status === 'over_budget' ? 'text-red-600' : 'text-blue-600'
            }`}>
              Actual Spent
            </div>
            <div className={`text-xl font-bold ${
              progress.status === 'over_budget' ? 'text-red-900' : 'text-blue-900'
            }`}>
              {formatCurrency(progress.actual_spent)}
            </div>
          </div>

          {/* Variance */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Variance</div>
            <div className={`text-xl font-bold ${getVarianceColor(progress.variance)}`}>
              {parseFloat(progress.variance) > 0 ? '+' : ''}
              {formatCurrency(progress.variance)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {parseFloat(progress.variance) > 0 ? 'Over expected' : 'Under expected'}
            </div>
          </div>

          {/* Total Budget */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 mb-2">Total Budget</div>
            <div className="text-xl font-bold text-green-900">
              {formatCurrency(progress.total_budget)}
            </div>
          </div>
        </div>

        {/* End of Month Projection */}
        {progress.budget_type === 'fixed' && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              📊 End-of-Month Projection
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 mb-2">Projected Total</div>
                <div className="text-xl font-bold text-purple-900">
                  {formatCurrency(progress.projection_end_of_month)}
                </div>
              </div>

              <div className={`rounded-lg p-4 ${
                parseFloat(progress.projected_variance_at_end) > 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <div className={`text-sm mb-2 ${
                  parseFloat(progress.projected_variance_at_end) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  Projected Variance
                </div>
                <div className={`text-xl font-bold ${
                  parseFloat(progress.projected_variance_at_end) > 0 ? 'text-red-900' : 'text-green-900'
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
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              📂 Category Breakdown
            </h4>
            <div className="space-y-3">
              {progress.categories?.map((category) => (
                <div
                  key={category.category_id}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">
                      {category.category_name}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(category.status)}`}>
                      {getStatusText(category.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-gray-600 text-xs">Planned</div>
                      <div className="font-semibold">
                        {formatCurrency(category.planned_amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 text-xs">Spent</div>
                      <div className="font-semibold">
                        {formatCurrency(category.actual_spent)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 text-xs">Variance</div>
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
