import { useEffect, useState } from 'react';
import type { Budget, CreateBudgetRequest } from '../types/budget';
import type { ApiResponse } from '../types/transaction';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';

interface BudgetListProps {
  onViewDetails: (budgetId: number) => void;
}

export default function BudgetList({ onViewDetails }: BudgetListProps) {
  const { token } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateBudgetRequest>({
    name: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    budget_type: 'fixed',
    amount: 0,
  });

  useEffect(() => {
    fetchBudgets();
  }, [token]);

  const fetchBudgets = async () => {
    if (!token) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Active-Organization': '1',
    };

    try {
      const response = await fetch(financialUrl('budgets'), { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch budgets');
      }

      const data: ApiResponse<Budget[]> = await response.json();
      setBudgets(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Active-Organization': '1',
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(financialUrl('budgets'), {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create budget');
      }

      // Reset form and refresh list
      setFormData({
        name: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        budget_type: 'fixed',
        amount: 0,
      });
      setShowCreateForm(false);
      fetchBudgets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget');
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(amount));
  };

  const getMonthName = (month: number) => {
    const date = new Date(2024, month - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long' });
  };

  const getBudgetTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'Fixo';
      case 'calculated':
        return 'Calculado';
      case 'hybrid':
        return 'Híbrido';
      default:
        return type;
    }
  };

  const getBudgetTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'bg-blue-100 text-blue-800';
      case 'calculated':
        return 'bg-green-100 text-green-800';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Carregando orçamentos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Erro: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
            <p className="text-gray-600 mt-2">
              {(budgets?.length ?? 0)} orçamento{(budgets?.length ?? 0) !== 1 ? 's' : ''} encontrado{(budgets?.length ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
          >
            {showCreateForm ? 'Cancelar' : '+ Novo Orçamento'}
          </button>
        </div>

        {/* Create Budget Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Criar Novo Orçamento</h2>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Orçamento Mensal de Janeiro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.budget_type}
                    onChange={(e) => setFormData({ ...formData, budget_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="fixed">Fixo</option>
                    <option value="calculated">Calculado</option>
                    <option value="hybrid">Híbrido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mês
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {getMonthName(month)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                    min={2020}
                    max={2100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    required
                    min={0}
                    step={0.01}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Criando...' : 'Criar Orçamento'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Budgets Grid */}
        {budgets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-lg mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-gray-600 mb-4">Crie seu primeiro orçamento para começar a gerenciar suas finanças</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              + Criar Primeiro Orçamento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((budget) => (
              <div
                key={budget.BudgetID}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {budget.Name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {getMonthName(budget.Month)} {budget.Year}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getBudgetTypeBadgeColor(budget.BudgetType)}`}>
                    {getBudgetTypeLabel(budget.BudgetType)}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(budget.Amount)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Orçamento total
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className={`text-sm ${budget.IsActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {budget.IsActive ? '● Ativo' : '○ Inativo'}
                  </div>
                  <button
                    onClick={() => onViewDetails(budget.BudgetID)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver detalhes →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
