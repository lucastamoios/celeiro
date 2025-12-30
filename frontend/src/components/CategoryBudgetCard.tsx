import { useState } from 'react';
import type { CategoryBudget } from '../types/budget';
import { getVarianceStatus, VARIANCE_THRESHOLDS } from '../types/budget';

interface CategoryBudgetCardProps {
  budget: CategoryBudget;
  categoryName: string;
  actualSpent: string; // Current spending for this category
  canConsolidate?: boolean; // Only allow consolidation after month ends
  onEdit?: (budget: CategoryBudget) => void;
  onDelete?: (budgetId: number) => void;
  onConsolidate?: (budgetId: number) => void;
}

export default function CategoryBudgetCard({
  budget,
  categoryName,
  actualSpent,
  canConsolidate = false,
  onEdit,
  onDelete,
  onConsolidate,
}: CategoryBudgetCardProps) {
  const [showActions, setShowActions] = useState(false);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(isNaN(num) ? 0 : num);
  };

  // Calculate variance (with safety checks for NaN)
  const plannedNum = parseFloat(budget.PlannedAmount || '0') || 0;
  const actualNum = parseFloat(actualSpent || '0') || 0;
  const variance = actualNum - plannedNum;
  const variancePercent = plannedNum > 0 ? (variance / plannedNum) * 100 : 0;
  const varianceStatus = getVarianceStatus(variancePercent);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'on_track':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical':
        return 'Critical';
      case 'warning':
        return 'Warning';
      case 'on_track':
        return 'On Track';
      default:
        return status;
    }
  };

  const getVarianceColor = () => {
    if (variancePercent > VARIANCE_THRESHOLDS.MAJOR) return 'text-red-600 font-semibold';
    if (variancePercent > VARIANCE_THRESHOLDS.MINOR) return 'text-yellow-600';
    if (variancePercent < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getBudgetTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'Fixed';
      case 'calculated':
        return 'Calculated';
      case 'maior':
        return 'Maior';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{categoryName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
              {getBudgetTypeLabel(budget.BudgetType)}
            </span>
            {budget.IsConsolidated && (
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                Consolidated
              </span>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        {!budget.IsConsolidated && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(budget);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    Edit Budget
                  </button>
                )}
                {onConsolidate && canConsolidate && (
                  <button
                    onClick={() => {
                      onConsolidate(budget.CategoryBudgetID);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    Consolidar
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir o orçamento de "${categoryName}"?`)) {
                        onDelete(budget.CategoryBudgetID);
                      }
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600"
                  >
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Budget Details */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-sm text-gray-600">Planned</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(budget.PlannedAmount)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Actual</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(actualSpent)}
          </div>
        </div>
      </div>

      {/* Variance */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Variance</div>
            <div className={`text-lg font-medium ${getVarianceColor()}`}>
              {variance >= 0 ? '+' : ''}
              {formatCurrency(variance.toFixed(2))}
              <span className="text-sm ml-1">
                ({variancePercent >= 0 ? '+' : ''}
                {variancePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(varianceStatus)}`}>
              {getStatusText(varianceStatus)}
            </span>
          </div>
        </div>

        {/* Variance Warning */}
        {varianceStatus === 'warning' && (
          <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
            <strong>⚠️ Minor variance:</strong> Spending is {variancePercent.toFixed(1)}% over budget
          </div>
        )}
        {varianceStatus === 'critical' && (
          <div className="mt-2 text-xs text-red-700 bg-red-50 px-3 py-2 rounded border border-red-200">
            <strong>🚨 Critical variance:</strong> Spending is {variancePercent.toFixed(1)}% over budget
          </div>
        )}
      </div>

      {/* Consolidated Info */}
      {budget.IsConsolidated && budget.ConsolidatedAt && (
        <div className="mt-3 text-xs text-gray-500 border-t border-gray-200 pt-3">
          Consolidated on {new Date(budget.ConsolidatedAt).toLocaleDateString('pt-BR')}
        </div>
      )}
    </div>
  );
}
