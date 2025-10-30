import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { BudgetWithItems, BudgetSpending } from '../types/budget';
import type { Category } from '../types/category';
import type { ApiResponse } from '../types/transaction';
import { getBudgetSpending, createBudgetItem, updateBudgetItem, deleteBudgetItem } from '../api/budget';
import BudgetItemForm from './BudgetItemForm';
import { financialUrl } from '../config/api';

interface BudgetDetailProps {
  budgetId: number;
  onBack?: () => void;
}

export default function BudgetDetail({ budgetId, onBack }: BudgetDetailProps) {
  const { token } = useAuth();
  const [budget, setBudget] = useState<BudgetWithItems | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spending, setSpending] = useState<BudgetSpending | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;

    fetchBudgetData();
  }, [budgetId, token]);

  const fetchBudgetData = async () => {
    if (!token) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Active-Organization': '1',
    };

    setLoading(true);
    setError(null);

    try {
      // Fetch budget with items
      const budgetResponse = await fetch(
        financialUrl('budgets', budgetId.toString()),
        { headers }
      );

      if (!budgetResponse.ok) {
        throw new Error('Failed to fetch budget');
      }

      const budgetData: ApiResponse<BudgetWithItems> = await budgetResponse.json();
      setBudget(budgetData.data);

      // Fetch categories for display
      const categoriesResponse = await fetch(
        financialUrl('categories'),
        { headers }
      );

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories');
      }

      const categoriesData: ApiResponse<Category[]> = await categoriesResponse.json();
      setCategories(categoriesData.data);

      // Fetch spending data
      try {
        const spendingData = await getBudgetSpending(budgetId, { token });
        setSpending(spendingData);
      } catch (spendingErr) {
        // Spending data is optional, don't fail the whole page
        console.warn('Failed to fetch spending data:', spendingErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget data');
    } finally {
      setLoading(false);
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

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find((c) => c.CategoryID === categoryId);
    return category ? category.Name : 'Unknown';
  };

  const getSpentAmount = (categoryId: number): number => {
    if (!spending?.category_spending) return 0;
    const spent = spending.category_spending[categoryId];
    return spent ? parseFloat(spent) : 0;
  };

  const calculateProgress = (planned: string, categoryId: number): number => {
    const plannedAmount = parseFloat(planned);
    if (plannedAmount === 0) return 0;
    const spent = getSpentAmount(categoryId);
    return (spent / plannedAmount) * 100;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const calculateTotalPlanned = (): number => {
    if (!budget?.Items) return 0;
    return budget.Items.reduce((sum, item) => {
      return sum + parseFloat(item.PlannedAmount);
    }, 0);
  };

  const handleBackToBudgets = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const handleAddItem = async (categoryId: number, amount: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createBudgetItem(
        budgetId,
        {
          category_id: categoryId,
          planned_amount: amount,
        },
        { token }
      );

      setSuccessMessage('Budget item added successfully!');
      setShowAddForm(false);

      // Refresh budget data
      await fetchBudgetData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to add budget item'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setErrorMessage(null);
  };

  const handleStartEdit = (itemId: number, currentAmount: string) => {
    setEditingItemId(itemId);
    setEditAmount(currentAmount);
    setErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditAmount('');
    setErrorMessage(null);
  };

  const handleSaveEdit = async (itemId: number) => {
    if (!token) return;

    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await updateBudgetItem(
        budgetId,
        itemId,
        { planned_amount: parsedAmount },
        { token }
      );

      setSuccessMessage('Budget item updated successfully!');
      setEditingItemId(null);
      setEditAmount('');

      // Refresh budget data
      await fetchBudgetData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update budget item'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (itemId: number) => {
    setDeleteConfirmId(itemId);
    setErrorMessage(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleConfirmDelete = async (itemId: number) => {
    if (!token) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await deleteBudgetItem(budgetId, itemId, { token });

      setSuccessMessage('Budget item deleted successfully!');
      setDeleteConfirmId(null);

      // Refresh budget data
      await fetchBudgetData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to delete budget item'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-600">Loading budget details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchBudgetData}
          className="mt-2 text-red-600 hover:text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="text-center py-8 text-gray-600">
        Budget not found
      </div>
    );
  }

  const totalPlanned = calculateTotalPlanned();
  const budgetAmount = parseFloat(budget.Budget.Amount);
  const remaining = budgetAmount - totalPlanned;
  const percentageUsed = budgetAmount > 0 ? (totalPlanned / budgetAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBackToBudgets}
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Budgets
      </button>

      {/* Budget Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {budget.Budget.Name}
            </h2>
            <div className="text-gray-600">
              {getMonthName(budget.Budget.Month)} {budget.Budget.Year}
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              budget.Budget.BudgetType === 'fixed'
                ? 'bg-blue-100 text-blue-800'
                : budget.Budget.BudgetType === 'calculated'
                ? 'bg-green-100 text-green-800'
                : 'bg-purple-100 text-purple-800'
            }`}
          >
            {budget.Budget.BudgetType}
          </span>
        </div>

        {/* Budget Amounts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Budget</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(budget.Budget.Amount)}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 mb-1">Planned</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(totalPlanned.toString())}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {percentageUsed.toFixed(1)}% of budget
            </div>
          </div>

          <div
            className={`rounded-lg p-4 ${
              remaining >= 0 ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <div
              className={`text-sm mb-1 ${
                remaining >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              Remaining
            </div>
            <div
              className={`text-2xl font-bold ${
                remaining >= 0 ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {formatCurrency(Math.abs(remaining).toString())}
            </div>
            {remaining < 0 && (
              <div className="text-xs text-red-600 mt-1">Over budget!</div>
            )}
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Budget Items List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Budget Items
          </h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Category
          </button>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h4 className="text-md font-semibold text-gray-900 mb-4">
              Add Budget Item
            </h4>
            <BudgetItemForm
              categories={categories}
              onSubmit={handleAddItem}
              onCancel={handleCancelAdd}
              isLoading={isSubmitting}
            />
          </div>
        )}

        {budget.Items && budget.Items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Planned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budget.Items.map((item) => {
                  const spent = getSpentAmount(item.CategoryID);
                  const progress = calculateProgress(item.PlannedAmount, item.CategoryID);
                  const progressColor = getProgressColor(progress);

                  return (
                    <tr key={item.BudgetItemID} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">💰</span>
                          <span className="font-medium text-gray-900">
                            {getCategoryName(item.CategoryID)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingItemId === item.BudgetItemID ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">R$</span>
                            <input
                              type="text"
                              value={editAmount}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  setEditAmount(value);
                                }
                              }}
                              className="w-24 px-2 py-1 border border-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(item.BudgetItemID)}
                              disabled={isSubmitting}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSubmitting}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div
                            className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                            onClick={() => handleStartEdit(item.BudgetItemID, item.PlannedAmount)}
                          >
                            {formatCurrency(item.PlannedAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(spent.toString())}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-600">
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${progressColor}`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {deleteConfirmId === item.BudgetItemID ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-gray-700 text-xs mr-2">Delete?</span>
                            <button
                              onClick={() => handleConfirmDelete(item.BudgetItemID)}
                              disabled={isSubmitting}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              Yes
                            </button>
                            <button
                              onClick={handleCancelDelete}
                              disabled={isSubmitting}
                              className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteClick(item.BudgetItemID)}
                            disabled={isSubmitting}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No budget items yet. Add items to start tracking your spending.
          </div>
        )}
      </div>
    </div>
  );
}
