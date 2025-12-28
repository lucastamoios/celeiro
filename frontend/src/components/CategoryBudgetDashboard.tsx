import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { CategoryBudget, CreateCategoryBudgetRequest, CreatePlannedEntryRequest, PlannedEntryWithStatus } from '../types/budget';
import type { Category } from '../types/category';
import type { ApiResponse } from '../types/transaction';
import {
  getCategoryBudgets,
  createCategoryBudget,
  updateCategoryBudget,
  deleteCategoryBudget,
  consolidateCategoryBudget,
  createPlannedEntry,
  getPlannedEntriesForMonth,
  // matchPlannedEntry, // TODO: Will be used when match modal is implemented
  unmatchPlannedEntry,
  dismissPlannedEntry,
  undismissPlannedEntry,
} from '../api/budget';
import { financialUrl } from '../config/api';
import PlannedEntryForm from './PlannedEntryForm';
import MonthlyBudgetCard from './MonthlyBudgetCard';
import PlannedEntryCard from './PlannedEntryCard';

interface MonthlyBudgetData {
  month: number;
  year: number;
  budgets: CategoryBudget[];
  isConsolidated: boolean;
}

export default function CategoryBudgetDashboard() {
  const { token } = useAuth();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudgetData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [actualSpending, setActualSpending] = useState<Record<number, string>>({});
  const [plannedEntries, setPlannedEntries] = useState<PlannedEntryWithStatus[]>([]);
  const [plannedEntriesLoading, setPlannedEntriesLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
  const [showCreateEntryModal, setShowCreateEntryModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'calculated' | 'maior'>('fixed');
  const [plannedAmount, setPlannedAmount] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    fetchAllData();
  }, [token]);

  const fetchAllData = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch categories
      const categoriesResponse = await fetch(
        financialUrl('categories'),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        }
      );

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories');
      }

      const categoriesData: ApiResponse<Category[]> = await categoriesResponse.json();
      setCategories(categoriesData.data);

      // Generate list of months to fetch (last 6 months + current month)
      const monthsToFetch: Array<{ month: number; year: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - 1 - i, 1);
        monthsToFetch.push({
          month: date.getMonth() + 1,
          year: date.getFullYear(),
        });
      }

      // Fetch budgets for all months in parallel
      const allBudgetsPromises = monthsToFetch.map(({ month, year }) =>
        getCategoryBudgets(
          { month, year },
          { token, organizationId: '1' }
        ).then(budgets => ({ month, year, budgets: budgets || [] }))
        .catch(err => {
          console.error(`Failed to fetch budgets for ${month}/${year}:`, err);
          return { month, year, budgets: [] };
        })
      );

      const allBudgetsResults = await Promise.all(allBudgetsPromises);

      // Group budgets by month and check if consolidated
      const monthlyData: MonthlyBudgetData[] = allBudgetsResults.map(({ month, year, budgets }) => {
        const budgetArray = Array.isArray(budgets) ? budgets : [];
        const isConsolidated = budgetArray.length > 0 && budgetArray.every(b => b.IsConsolidated);
        return {
          month,
          year,
          budgets: budgetArray,
          isConsolidated,
        };
      });

      setMonthlyBudgets(monthlyData);

      // Fetch actual spending for all category IDs
      const allCategoryIds = new Set<number>();
      allBudgetsResults.forEach(({ budgets }) => {
        budgets.forEach(b => allCategoryIds.add(b.CategoryID));
      });

      await fetchActualSpending(Array.from(allCategoryIds));

      // Fetch planned entries for current month
      await fetchPlannedEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlannedEntries = async () => {
    if (!token) return;

    setPlannedEntriesLoading(true);
    try {
      const entries = await getPlannedEntriesForMonth(currentMonth, currentYear, {
        token,
        organizationId: '1',
      });
      setPlannedEntries(entries || []);
    } catch (err) {
      console.error('Failed to fetch planned entries:', err);
      // Don't set error state to avoid blocking the rest of the UI
    } finally {
      setPlannedEntriesLoading(false);
    }
  };

  const fetchActualSpending = async (categoryIds: number[]) => {
    if (!token || categoryIds.length === 0) return;

    // TODO: This should be replaced with a proper backend endpoint
    // For now, we'll set placeholder values
    const spending: Record<number, string> = {};
    categoryIds.forEach(id => {
      spending[id] = '0.00'; // Placeholder
    });
    setActualSpending(spending);
  };

  const handleCreateBudget = async () => {
    if (!token) return;

    if (!selectedCategoryId) {
      setError('Please select a category');
      return;
    }

    // For fixed budgets, planned amount is required
    if (budgetType === 'fixed') {
      if (!plannedAmount) {
        setError('Please enter a planned amount');
        return;
      }

      const parsedAmount = parseFloat(plannedAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Planned amount must be a valid number greater than 0');
        return;
      }
    }

    // For calculated/maior budgets, default to 0 if not provided
    const parsedAmount = plannedAmount ? parseFloat(plannedAmount) : 0

    setIsSubmitting(true);
    setError(null);

    try {
      const data: CreateCategoryBudgetRequest = {
        category_id: parseInt(selectedCategoryId),
        month: currentMonth,
        year: currentYear,
        budget_type: budgetType,
        planned_amount: parsedAmount,
      };

      await createCategoryBudget(data, { token, organizationId: '1' });

      setSuccessMessage('Category budget created successfully!');
      setShowCreateBudgetModal(false);
      resetBudgetForm();
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBudget = (budget: CategoryBudget) => {
    setEditingBudget(budget);
    setSelectedCategoryId(budget.CategoryID.toString());
    setBudgetType(budget.BudgetType);
    setPlannedAmount(budget.PlannedAmount);
    setShowCreateBudgetModal(true);
  };

  const handleUpdateBudget = async () => {
    if (!token || !editingBudget) return;

    // For fixed budgets, validate planned amount
    if (budgetType === 'fixed') {
      if (!plannedAmount) {
        setError('Please enter a planned amount');
        return;
      }

      const parsedAmount = parseFloat(plannedAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Planned amount must be a valid number greater than 0');
        return;
      }
    }

    // For calculated/maior budgets, use provided amount or 0
    const parsedAmount = plannedAmount ? parseFloat(plannedAmount) : 0

    setIsSubmitting(true);
    setError(null);

    try {
      await updateCategoryBudget(
        editingBudget.CategoryBudgetID,
        {
          budget_type: budgetType,
          planned_amount: parsedAmount,
        },
        { token, organizationId: '1' }
      );

      setSuccessMessage('Budget updated successfully!');
      setShowCreateBudgetModal(false);
      setEditingBudget(null);
      resetBudgetForm();
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (budgetId: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteCategoryBudget(budgetId, { token, organizationId: '1' });

      setSuccessMessage('Budget deleted successfully!');
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConsolidateBudget = async (budgetId: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await consolidateCategoryBudget(budgetId, { token, organizationId: '1' });

      setSuccessMessage('Budget consolidated successfully!');
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to consolidate budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePlannedEntry = async (data: CreatePlannedEntryRequest) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createPlannedEntry(data, { token, organizationId: '1' });

      setSuccessMessage('Entrada planejada criada com sucesso!');
      setShowCreateEntryModal(false);
      await fetchAllData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar entrada planejada');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Planned Entry Status Handlers
  const handleMatchPlannedEntry = async (entryId: number) => {
    // TODO: Open a modal to select a transaction to match
    // For now, this is a placeholder
    console.log('Match entry:', entryId);
    setError('Matching UI not yet implemented. Use the transaction view to match.');
  };

  const handleUnmatchPlannedEntry = async (entryId: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await unmatchPlannedEntry(entryId, currentMonth, currentYear, {
        token,
        organizationId: '1',
      });

      setSuccessMessage('Entrada desvinculada com sucesso!');
      await fetchPlannedEntries();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desvincular entrada');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissPlannedEntry = async (entryId: number, reason?: string) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await dismissPlannedEntry(entryId, {
        month: currentMonth,
        year: currentYear,
        reason,
      }, {
        token,
        organizationId: '1',
      });

      setSuccessMessage('Entrada dispensada com sucesso!');
      await fetchPlannedEntries();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao dispensar entrada');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndismissPlannedEntry = async (entryId: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await undismissPlannedEntry(entryId, currentMonth, currentYear, {
        token,
        organizationId: '1',
      });

      setSuccessMessage('Entrada reativada com sucesso!');
      await fetchPlannedEntries();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reativar entrada');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetBudgetForm = () => {
    setSelectedCategoryId('');
    setBudgetType('fixed');
    setPlannedAmount('');
  };

  const handleCancelBudgetForm = () => {
    setShowCreateBudgetModal(false);
    setEditingBudget(null);
    resetBudgetForm();
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-9 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-2/3"></div>
          </div>

          {/* Month/Year selector skeleton */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="h-10 bg-gray-200 rounded w-32"></div>
                <div className="h-10 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-200 rounded w-40"></div>
                <div className="h-10 bg-gray-200 rounded w-40"></div>
              </div>
            </div>
          </div>

          {/* Category budget cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Orçamentos</h1>
            <p className="text-gray-600">
              Acompanhe seus orçamentos mensais por categoria
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateEntryModal(true)}
              className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              + Entrada Planejada
            </button>
            <button
              onClick={() => setShowCreateBudgetModal(true)}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Orçamento de Categoria
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Planned Entries Section */}
        {plannedEntries.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Entradas Planejadas - {new Date(currentYear, currentMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-gray-600">Recebido</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span className="text-gray-600">Pendente</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span className="text-gray-600">Atrasado</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                  <span className="text-gray-600">Dispensado</span>
                </div>
              </div>
            </div>

            {/* Alert for missed entries */}
            {plannedEntries.some(e => e.Status === 'missed') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800">
                  <strong>Atenção!</strong> Existem entradas planejadas em atraso que precisam de atenção.
                </span>
              </div>
            )}

            {plannedEntriesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plannedEntries.map((entry) => {
                  const category = categories.find(c => c.category_id === entry.CategoryID);
                  return (
                    <PlannedEntryCard
                      key={entry.PlannedEntryID}
                      entry={entry}
                      categoryName={category?.name || 'Categoria desconhecida'}
                      month={currentMonth}
                      year={currentYear}
                      onMatch={handleMatchPlannedEntry}
                      onUnmatch={handleUnmatchPlannedEntry}
                      onDismiss={handleDismissPlannedEntry}
                      onUndismiss={handleUndismissPlannedEntry}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Monthly Budget Timeline */}
        {monthlyBudgets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum orçamento encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Crie seu primeiro orçamento de categoria para começar a rastrear despesas
            </p>
            <button
              onClick={() => setShowCreateBudgetModal(true)}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Criar Primeiro Orçamento
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {monthlyBudgets
              .slice()
              .reverse()
              .map(({ month, year, budgets, isConsolidated }) => {
                const isCurrent = month === currentMonth && year === currentYear;
                return (
                  <MonthlyBudgetCard
                    key={`${year}-${month}`}
                    month={month}
                    year={year}
                    budgets={budgets}
                    categories={categories}
                    actualSpending={actualSpending}
                    isCurrent={isCurrent}
                    isConsolidated={isConsolidated}
                    onEditBudget={handleEditBudget}
                    onDeleteBudget={handleDeleteBudget}
                    onConsolidate={handleConsolidateBudget}
                  />
                );
              })}
          </div>
        )}

        {/* Create/Edit Budget Modal */}
        {showCreateBudgetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {editingBudget ? 'Edit Category Budget' : 'Create Category Budget'}
              </h3>

              <div className="space-y-4">
                {/* Category Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    disabled={!!editingBudget || isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select a category</option>
                    {categories?.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Type *
                  </label>
                  <select
                    value={budgetType}
                    onChange={(e) => setBudgetType(e.target.value as any)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="calculated">Calculated</option>
                    <option value="maior">Maior</option>
                  </select>
                </div>

                {/* Planned Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planned Amount {budgetType === 'fixed' ? '*' : '(Optional)'}
                  </label>
                  {budgetType !== 'fixed' && (
                    <p className="text-xs text-gray-500 mb-2">
                      💡 For calculated budgets, the amount will be automatically calculated from planned entries
                    </p>
                  )}
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={plannedAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setPlannedAmount(value);
                        }
                      }}
                      disabled={isSubmitting}
                      placeholder={budgetType === 'fixed' ? '0.00' : '0.00 (will be calculated)'}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCancelBudgetForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingBudget ? handleUpdateBudget : handleCreateBudget}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingBudget ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Planned Entry Modal */}
        {showCreateEntryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Criar Entrada Planejada
              </h3>

              <PlannedEntryForm
                categories={categories}
                onSubmit={handleCreatePlannedEntry}
                onCancel={() => setShowCreateEntryModal(false)}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
