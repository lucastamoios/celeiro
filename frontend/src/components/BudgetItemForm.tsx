import { useState, useEffect } from 'react';
import type { Category } from '../types/category';
import type { BudgetItem } from '../types/budget';

interface BudgetItemFormProps {
  categories: Category[];
  onSubmit: (categoryId: number, amount: number) => void;
  onCancel: () => void;
  initialItem?: BudgetItem;
  isLoading?: boolean;
}

export default function BudgetItemForm({
  categories,
  onSubmit,
  onCancel,
  initialItem,
  isLoading = false,
}: BudgetItemFormProps) {
  const [categoryId, setCategoryId] = useState<string>(
    initialItem?.CategoryID.toString() || ''
  );
  const [amount, setAmount] = useState<string>(
    initialItem?.PlannedAmount || ''
  );
  const [errors, setErrors] = useState<{
    categoryId?: string;
    amount?: string;
  }>({});

  useEffect(() => {
    if (initialItem) {
      setCategoryId(initialItem.CategoryID.toString());
      setAmount(initialItem.PlannedAmount);
    }
  }, [initialItem]);

  const validateForm = (): boolean => {
    const newErrors: { categoryId?: string; amount?: string } = {};

    if (!categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount)) {
      newErrors.amount = 'Amount is required';
    } else if (parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const parsedAmount = parseFloat(amount);
    onSubmit(parseInt(categoryId), parsedAmount);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      // Clear error when user starts typing
      if (errors.amount) {
        setErrors({ ...errors, amount: undefined });
      }
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryId(e.target.value);
    // Clear error when user selects a category
    if (errors.categoryId) {
      setErrors({ ...errors, categoryId: undefined });
    }
  };

  const formatCurrencyPreview = (value: string): string => {
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parsedValue);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category Dropdown */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Category *
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={handleCategoryChange}
          disabled={isLoading}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.categoryId ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a category</option>
          {categories?.map((category) => (
            <option key={category.CategoryID} value={category.CategoryID}>
              {category.Name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
        )}
      </div>

      {/* Amount Input */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Planned Amount *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">R$</span>
          <input
            id="amount"
            type="text"
            value={amount}
            onChange={handleAmountChange}
            disabled={isLoading}
            placeholder="0.00"
            className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        {amount && !errors.amount && (
          <p className="mt-1 text-sm text-gray-600">
            Preview: {formatCurrencyPreview(amount)}
          </p>
        )}
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : initialItem ? 'Update Item' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}
