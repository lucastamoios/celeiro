import { useState } from 'react';
import { Check, AlertTriangle, Coins } from 'lucide-react';
import type { SavingsGoal, SavingsGoalProgress } from '../types/savingsGoals';
import {
  getGoalTypeLabel,
  getProgressColor,
  getProgressBadgeClasses,
  formatCurrency,
  formatProgress,
} from '../types/savingsGoals';

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  progress?: SavingsGoalProgress;
  onEdit?: (goal: SavingsGoal) => void;
  onDelete?: (goalId: number) => void;
  onComplete?: (goalId: number) => void;
  onReopen?: (goalId: number) => void;
  onAddContribution?: (goalId: number) => void;
  onClick?: (goalId: number) => void;
}

export default function SavingsGoalCard({
  goal,
  progress,
  onEdit,
  onDelete,
  onComplete,
  onReopen,
  onAddContribution,
  onClick,
}: SavingsGoalCardProps) {
  const [showActions, setShowActions] = useState(false);

  // Calculate progress from the progress prop or estimate from goal data
  const currentAmount = progress?.current_amount || '0';
  const progressPercent = progress?.progress_percent
    ? parseFloat(progress.progress_percent)
    : 0;

  const targetNum = parseFloat(goal.target_amount);
  const currentNum = parseFloat(currentAmount);
  const remaining = targetNum - currentNum;

  // Format due date if present
  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`card p-4 hover:shadow-warm-lg transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      } ${goal.is_completed ? 'opacity-75' : ''}`}
      onClick={() => onClick?.(goal.savings_goal_id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {goal.icon && (
            <span className="text-2xl" role="img" aria-label="goal icon">
              {goal.icon}
            </span>
          )}
          <div>
            <h3 className="text-lg font-semibold text-stone-900">{goal.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  goal.goal_type === 'reserva'
                    ? 'bg-wheat-100 text-wheat-800'
                    : 'bg-terra-100 text-terra-800'
                }`}
              >
                {getGoalTypeLabel(goal.goal_type)}
              </span>
              {goal.is_completed && (
                <span className="text-xs px-2 py-1 rounded bg-sage-100 text-sage-800 inline-flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Concluído
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        {!goal.is_completed && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              aria-label="Actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-stone-600"
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
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-warm-lg border border-stone-200 py-1 z-10 min-w-[140px]">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(goal);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
                  >
                    ✏️ Editar
                  </button>
                )}
                {onAddContribution && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddContribution(goal.savings_goal_id);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-wheat-700 hover:bg-wheat-50 flex items-center gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    Adicionar
                  </button>
                )}
                {onComplete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(goal.savings_goal_id);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-sage-700 hover:bg-sage-50 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Concluir
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(goal.savings_goal_id);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-rust-700 hover:bg-rust-50"
                  >
                    🗑️ Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reopen action for completed goals */}
        {goal.is_completed && onReopen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReopen(goal.savings_goal_id);
            }}
            className="px-3 py-1 text-sm text-wheat-600 hover:bg-wheat-50 rounded transition-colors"
          >
            Reabrir
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-stone-600 mb-1">
          <span>Progresso</span>
          <span className="font-medium">{formatProgress(progressPercent)}</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(
              progressPercent
            )}`}
            style={{
              width: `${Math.min(progressPercent, 100)}%`,
              backgroundColor: goal.color || undefined,
            }}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-stone-500">Atual</p>
          <p className="text-lg font-semibold text-stone-900 tabular-nums">
            {formatCurrency(currentAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-500">Meta</p>
          <p className="text-lg font-semibold text-stone-900 tabular-nums">
            {formatCurrency(goal.target_amount)}
          </p>
        </div>
      </div>

      {/* Remaining and Due Date */}
      <div className="flex items-center justify-between text-sm border-t border-stone-100 pt-3">
        <div>
          <span className="text-stone-500">Faltam: </span>
          <span className={remaining <= 0 ? 'text-sage-600 font-medium' : 'text-stone-900 tabular-nums'}>
            {remaining <= 0 ? 'Concluído!' : formatCurrency(remaining)}
          </span>
        </div>

        {goal.due_date && (
          <div className="flex items-center gap-1">
            <span className="text-stone-400">📅</span>
            <span className="text-stone-600">{formatDueDate(goal.due_date)}</span>
          </div>
        )}
      </div>

      {/* Reserva-specific metrics */}
      {goal.goal_type === 'reserva' && progress && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between text-sm">
            {progress.months_remaining !== undefined && (
              <div>
                <span className="text-stone-500">Meses restantes: </span>
                <span className="font-medium">{progress.months_remaining}</span>
              </div>
            )}
            {progress.monthly_target && (
              <div>
                <span className="text-stone-500">Meta mensal: </span>
                <span className="font-medium text-wheat-600 tabular-nums">
                  {formatCurrency(progress.monthly_target)}
                </span>
              </div>
            )}
          </div>
          {progress.is_on_track !== undefined && (
            <div className="mt-2">
              <span
                className={`text-xs px-2 py-1 rounded border ${getProgressBadgeClasses(
                  progress.is_on_track
                )}`}
              >
                <span className="inline-flex items-center gap-1">
                  {progress.is_on_track ? (
                    <><Check className="w-3 h-3" /> No ritmo</>
                  ) : (
                    <><AlertTriangle className="w-3 h-3" /> Atrasado</>
                  )}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {goal.notes && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <p className="text-sm text-stone-500 italic">"{goal.notes}"</p>
        </div>
      )}
    </div>
  );
}
