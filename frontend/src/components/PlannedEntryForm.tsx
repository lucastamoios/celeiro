import { useState, useEffect } from 'react';
import type { Category } from '../types/category';
import type { PlannedEntry } from '../types/budget';

interface PlannedEntryFormProps {
  categories: Category[];
  onSubmit: (data: {
    category_id: number;
    description: string;
    amount: number;
    is_recurrent: boolean;
    expected_day?: number;
    is_saved_pattern: boolean;
  }) => void;
  onCancel: () => void;
  initialEntry?: PlannedEntry;
  isLoading?: boolean;
}

export default function PlannedEntryForm({
  categories,
  onSubmit,
  onCancel,
  initialEntry,
  isLoading = false,
}: PlannedEntryFormProps) {
  const [categoryId, setCategoryId] = useState<string>(
    initialEntry?.CategoryID.toString() || ''
  );
  const [description, setDescription] = useState<string>(
    initialEntry?.Description || ''
  );
  const [amount, setAmount] = useState<string>(
    initialEntry?.Amount || ''
  );
  const [isRecurrent, setIsRecurrent] = useState<boolean>(
    initialEntry?.IsRecurrent || false
  );
  const [expectedDay, setExpectedDay] = useState<string>(
    initialEntry?.ExpectedDay?.toString() || ''
  );
  const [isSavedPattern, setIsSavedPattern] = useState<boolean>(
    initialEntry?.IsSavedPattern || false
  );

  const [errors, setErrors] = useState<{
    categoryId?: string;
    description?: string;
    amount?: string;
    expectedDay?: string;
  }>({});

  useEffect(() => {
    if (initialEntry) {
      setCategoryId(initialEntry.CategoryID.toString());
      setDescription(initialEntry.Description);
      setAmount(initialEntry.Amount);
      setIsRecurrent(initialEntry.IsRecurrent);
      setExpectedDay(initialEntry.ExpectedDay?.toString() || '');
      setIsSavedPattern(initialEntry.IsSavedPattern);
    }
  }, [initialEntry]);

  const validateForm = (): boolean => {
    const newErrors: {
      categoryId?: string;
      description?: string;
      amount?: string;
      expectedDay?: string;
    } = {};

    if (!categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount)) {
      newErrors.amount = 'Amount is required';
    } else if (parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (isRecurrent && expectedDay) {
      const day = parseInt(expectedDay);
      if (isNaN(day) || day < 1 || day > 31) {
        newErrors.expectedDay = 'Day must be between 1 and 31';
      }
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
    const parsedExpectedDay = expectedDay ? parseInt(expectedDay) : undefined;

    onSubmit({
      category_id: parseInt(categoryId),
      description: description.trim(),
      amount: parsedAmount,
      is_recurrent: isRecurrent,
      expected_day: parsedExpectedDay,
      is_saved_pattern: isSavedPattern,
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      if (errors.amount) {
        setErrors({ ...errors, amount: undefined });
      }
    }
  };

  const handleExpectedDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    if (value === '' || /^\d+$/.test(value)) {
      setExpectedDay(value);
      if (errors.expectedDay) {
        setErrors({ ...errors, expectedDay: undefined });
      }
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
          onChange={(e) => {
            setCategoryId(e.target.value);
            if (errors.categoryId) {
              setErrors({ ...errors, categoryId: undefined });
            }
          }}
          disabled={isLoading}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.categoryId ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a category</option>
          {categories?.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
        )}
      </div>

      {/* Description Input */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description *
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) {
              setErrors({ ...errors, description: undefined });
            }
          }}
          disabled={isLoading}
          placeholder="e.g., Weekly Lunch"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Amount Input */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Amount *
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

      {/* Expected Day (for recurrent entries) */}
      <div>
        <label
          htmlFor="expectedDay"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Expected Day (1-31)
        </label>
        <input
          id="expectedDay"
          type="text"
          value={expectedDay}
          onChange={handleExpectedDayChange}
          disabled={isLoading}
          placeholder="e.g., 15"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.expectedDay ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional: Expected day of the month for this expense
        </p>
        {errors.expectedDay && (
          <p className="mt-1 text-sm text-red-600">{errors.expectedDay}</p>
        )}
      </div>

      {/* Checkboxes */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center">
          <input
            id="isRecurrent"
            type="checkbox"
            checked={isRecurrent}
            onChange={(e) => setIsRecurrent(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <label htmlFor="isRecurrent" className="ml-2 text-sm text-gray-700">
            Recurrent entry (generates monthly instances)
          </label>
        </div>

        <div className="flex items-center">
          <input
            id="isSavedPattern"
            type="checkbox"
            checked={isSavedPattern}
            onChange={(e) => setIsSavedPattern(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <label htmlFor="isSavedPattern" className="ml-2 text-sm text-gray-700">
            Save as transaction pattern (for auto-matching)
          </label>
        </div>
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
          {isLoading ? 'Saving...' : initialEntry ? 'Update Entry' : 'Create Entry'}
        </button>
      </div>
    </form>
  );
}
