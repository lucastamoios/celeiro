import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type {
  SavingsGoal,
  SavingsGoalProgress,
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  SavingsGoalType,
} from '../types/savingsGoals';
import {
  getGoalTypeLabel,
  getGoalTypeDescription,
  GOAL_COLORS,
  GOAL_ICONS,
  formatCurrency,
} from '../types/savingsGoals';
import {
  listSavingsGoals,
  getSavingsGoalProgress,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  completeSavingsGoal,
  reopenSavingsGoal,
  addContribution,
} from '../api/savingsGoals';
import SavingsGoalCard from './SavingsGoalCard';

export default function SavingsGoalsPage() {
  const { token } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, SavingsGoalProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterType, setFilterType] = useState<SavingsGoalType | 'all'>('all');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    goal_type: SavingsGoalType;
    target_amount: string;
    due_date: string;
    icon: string;
    color: string;
    notes: string;
  }>({
    name: '',
    goal_type: 'reserva',
    target_amount: '',
    due_date: '',
    icon: '🎯',
    color: GOAL_COLORS[0],
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Contribution modal state
  const [contributingGoalId, setContributingGoalId] = useState<number | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [submittingContribution, setSubmittingContribution] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fetchedGoals = await listSavingsGoals(
        {
          is_completed: showCompleted ? undefined : false,
          goal_type: filterType === 'all' ? undefined : filterType,
        },
        { token }
      );

      const safeGoals = fetchedGoals || [];
      setGoals(safeGoals);

      // Fetch progress for each goal
      if (safeGoals.length > 0) {
        const progressPromises = safeGoals.map((goal) =>
          getSavingsGoalProgress(goal.savings_goal_id, { token })
            .then((progress) => ({ id: goal.savings_goal_id, progress }))
            .catch(() => null)
        );

        const progressResults = await Promise.all(progressPromises);
        const newProgressMap: Record<number, SavingsGoalProgress> = {};
        progressResults.forEach((result) => {
          if (result) {
            newProgressMap[result.id] = result.progress;
          }
        });
        setProgressMap(newProgressMap);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  }, [token, showCompleted, filterType]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const resetForm = () => {
    setFormData({
      name: '',
      goal_type: 'reserva',
      target_amount: '',
      due_date: '',
      icon: '🎯',
      color: GOAL_COLORS[0],
      notes: '',
    });
    setEditingGoal(null);
    setFormError(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (goal: SavingsGoal) => {
    setFormData({
      name: goal.name,
      goal_type: goal.goal_type,
      target_amount: goal.target_amount,
      due_date: goal.due_date || '',
      icon: goal.icon || '🎯',
      color: goal.color || GOAL_COLORS[0],
      notes: goal.notes || '',
    });
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSaving(true);
      setFormError(null);

      // Validate
      if (!formData.name.trim()) {
        setFormError('Nome é obrigatório');
        setSaving(false);
        return;
      }
      if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
        setFormError('Valor da meta deve ser maior que zero');
        setSaving(false);
        return;
      }
      if (formData.goal_type === 'reserva' && !formData.due_date) {
        setFormError('Data limite é obrigatória para metas do tipo Reserva');
        setSaving(false);
        return;
      }

      if (editingGoal) {
        // Update existing goal
        const updateData: UpdateSavingsGoalRequest = {
          name: formData.name,
          target_amount: parseFloat(formData.target_amount),
          due_date: formData.due_date || undefined,
          icon: formData.icon,
          color: formData.color,
          notes: formData.notes || undefined,
        };
        await updateSavingsGoal(editingGoal.savings_goal_id, updateData, { token });
      } else {
        // Create new goal
        const createData: CreateSavingsGoalRequest = {
          name: formData.name,
          goal_type: formData.goal_type,
          target_amount: parseFloat(formData.target_amount),
          due_date: formData.due_date || undefined,
          icon: formData.icon,
          color: formData.color,
          notes: formData.notes || undefined,
        };
        await createSavingsGoal(createData, { token });
      }

      setShowForm(false);
      resetForm();
      fetchGoals();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goalId: number) => {
    if (!token) return;
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

    try {
      await deleteSavingsGoal(goalId, { token });
      fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    }
  };

  const handleComplete = async (goalId: number) => {
    if (!token) return;
    if (!confirm('Marcar esta meta como concluída?')) return;

    try {
      await completeSavingsGoal(goalId, { token });
      fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete goal');
    }
  };

  const handleReopen = async (goalId: number) => {
    if (!token) return;

    try {
      await reopenSavingsGoal(goalId, { token });
      fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reopen goal');
    }
  };

  const openContributionModal = (goalId: number) => {
    setContributingGoalId(goalId);
    setContributionAmount('');
    setContributionError(null);
  };

  const closeContributionModal = () => {
    setContributingGoalId(null);
    setContributionAmount('');
    setContributionError(null);
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || contributingGoalId === null) return;

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount === 0) {
      setContributionError('Informe um valor válido');
      return;
    }

    try {
      setSubmittingContribution(true);
      setContributionError(null);
      await addContribution(contributingGoalId, { amount }, { token });
      closeContributionModal();
      fetchGoals();
    } catch (err) {
      setContributionError(err instanceof Error ? err.message : 'Falha ao adicionar contribuição');
    } finally {
      setSubmittingContribution(false);
    }
  };

  // Get the goal being contributed to (for modal display)
  const contributingGoal = contributingGoalId
    ? goals.find((g) => g.savings_goal_id === contributingGoalId)
    : null;

  // Calculate summary stats (with defensive checks)
  const safeGoals = goals || [];
  const safeProgressMap = progressMap || {};
  const totalTarget = safeGoals.reduce((sum, g) => sum + parseFloat(g?.target_amount || '0'), 0);
  const totalCurrent = Object.values(safeProgressMap).reduce(
    (sum, p) => sum + parseFloat(p?.current_amount || '0'),
    0
  );
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🎯 Metas de Poupança</h1>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎯 Metas de Poupança</h1>
            <p className="text-gray-600 mt-1">
              Acompanhe suas metas de economia e investimento
            </p>
          </div>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>Nova Meta</span>
          </button>
        </div>

        {/* Summary Cards */}
        {goals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total das Metas</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalTarget)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Acumulado</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCurrent)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Progresso Geral</p>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-blue-600">
                  {overallProgress.toFixed(1)}%
                </p>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(overallProgress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Tipo:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as SavingsGoalType | 'all')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="reserva">Reserva</option>
              <option value="investimento">Investimento</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Mostrar concluídos
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Goals Grid */}
        {goals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma meta encontrada
            </h3>
            <p className="text-gray-500 mb-4">
              Crie sua primeira meta de poupança para começar a acompanhar seu progresso.
            </p>
            <button
              onClick={openCreateForm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <SavingsGoalCard
                key={goal.savings_goal_id}
                goal={goal}
                progress={progressMap[goal.savings_goal_id]}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onComplete={handleComplete}
                onReopen={handleReopen}
                onAddContribution={openContributionModal}
              />
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingGoal ? 'Editar Meta' : 'Nova Meta'}
              </h2>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Meta *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Viagem para Europa"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Goal Type (only for new goals) */}
                {!editingGoal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Meta *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['reserva', 'investimento'] as SavingsGoalType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, goal_type: type })}
                          className={`p-3 border rounded-lg text-left transition-colors ${
                            formData.goal_type === type
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <p className="font-medium text-gray-900">
                            {type === 'reserva' ? '📅' : '📈'} {getGoalTypeLabel(type)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getGoalTypeDescription(type)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor da Meta *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.target_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, target_amount: e.target.value })
                      }
                      placeholder="0,00"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Due Date (required for reserva) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Limite {formData.goal_type === 'reserva' && '*'}
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={formData.goal_type === 'reserva'}
                  />
                  {formData.goal_type === 'reserva' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Obrigatório para metas do tipo Reserva
                    </p>
                  )}
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ícone
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-10 h-10 text-xl rounded-lg border-2 transition-colors ${
                          formData.icon === icon
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor da Barra de Progresso
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          formData.color === color
                            ? 'border-gray-900 scale-110'
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Anotações sobre esta meta..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : editingGoal ? 'Salvar' : 'Criar Meta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contribution Modal */}
        {contributingGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[400px] max-w-[90vw]">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                💰 Adicionar Contribuição
              </h2>
              <p className="text-gray-600 mb-4">
                Meta: <span className="font-medium">{contributingGoal.name}</span>
              </p>

              {contributionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {contributionError}
                </div>
              )}

              <form onSubmit={handleSubmitContribution} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use valores positivos para adicionar ou negativos para subtrair
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeContributionModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingContribution}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {submittingContribution ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
