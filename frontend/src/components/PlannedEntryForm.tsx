import { useState, useEffect } from 'react';
import type { Category } from '../types/category';
import type { PlannedEntry, CreatePlannedEntryRequest } from '../types/budget';

interface PlannedEntryFormProps {
  categories: Category[];
  onSubmit: (data: CreatePlannedEntryRequest) => void;
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
  const [entryType, setEntryType] = useState<'expense' | 'income'>(
    initialEntry?.EntryType || 'expense'
  );

  // Amount range fields
  const [amountMin, setAmountMin] = useState<string>(
    initialEntry?.AmountMin || ''
  );
  const [amountMax, setAmountMax] = useState<string>(
    initialEntry?.AmountMax || ''
  );
  const [useSingleAmount, setUseSingleAmount] = useState<boolean>(
    !initialEntry?.AmountMin || initialEntry?.AmountMin === initialEntry?.AmountMax
  );

  // Day range fields
  const [expectedDayStart, setExpectedDayStart] = useState<string>(
    initialEntry?.ExpectedDayStart?.toString() || ''
  );
  const [expectedDayEnd, setExpectedDayEnd] = useState<string>(
    initialEntry?.ExpectedDayEnd?.toString() || ''
  );
  const [useSingleDay, setUseSingleDay] = useState<boolean>(
    !initialEntry?.ExpectedDayStart || initialEntry?.ExpectedDayStart === initialEntry?.ExpectedDayEnd
  );

  const [isRecurrent, setIsRecurrent] = useState<boolean>(
    initialEntry?.IsRecurrent || false
  );
  const [isSavedPattern, setIsSavedPattern] = useState<boolean>(
    initialEntry?.IsSavedPattern || false
  );
  const [descriptionPattern, setDescriptionPattern] = useState<string>('');

  const [errors, setErrors] = useState<{
    categoryId?: string;
    description?: string;
    descriptionPattern?: string;
    amountMin?: string;
    amountMax?: string;
    expectedDayStart?: string;
    expectedDayEnd?: string;
  }>({});

  useEffect(() => {
    if (initialEntry) {
      setCategoryId(initialEntry.CategoryID.toString());
      setDescription(initialEntry.Description);
      setEntryType(initialEntry.EntryType || 'expense');
      setAmountMin(initialEntry.AmountMin || initialEntry.Amount || '');
      setAmountMax(initialEntry.AmountMax || initialEntry.Amount || '');
      setUseSingleAmount(!initialEntry.AmountMin || initialEntry.AmountMin === initialEntry.AmountMax);
      setExpectedDayStart(initialEntry.ExpectedDayStart?.toString() || initialEntry.ExpectedDay?.toString() || '');
      setExpectedDayEnd(initialEntry.ExpectedDayEnd?.toString() || initialEntry.ExpectedDay?.toString() || '');
      setUseSingleDay(!initialEntry.ExpectedDayStart || initialEntry.ExpectedDayStart === initialEntry.ExpectedDayEnd);
      setIsRecurrent(initialEntry.IsRecurrent);
      setIsSavedPattern(initialEntry.IsSavedPattern);
    }
  }, [initialEntry]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    }

    if (!description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    // Validate pattern when isSavedPattern is checked
    if (isSavedPattern && !descriptionPattern.trim()) {
      newErrors.descriptionPattern = 'Padrão de descrição é obrigatório para auto-matching';
    }

    // Validate amount range
    const parsedAmountMin = parseFloat(amountMin);
    const parsedAmountMax = parseFloat(amountMax || amountMin);

    if (!amountMin || isNaN(parsedAmountMin)) {
      newErrors.amountMin = 'Valor é obrigatório';
    } else if (parsedAmountMin <= 0) {
      newErrors.amountMin = 'Valor deve ser maior que 0';
    }

    if (!useSingleAmount) {
      if (!amountMax || isNaN(parsedAmountMax)) {
        newErrors.amountMax = 'Valor máximo é obrigatório';
      } else if (parsedAmountMax < parsedAmountMin) {
        newErrors.amountMax = 'Valor máximo deve ser maior ou igual ao mínimo';
      }
    }

    // Validate day range
    if (expectedDayStart) {
      const dayStart = parseInt(expectedDayStart);
      if (isNaN(dayStart) || dayStart < 1 || dayStart > 31) {
        newErrors.expectedDayStart = 'Dia deve estar entre 1 e 31';
      }
    }

    if (!useSingleDay && expectedDayEnd) {
      const dayEnd = parseInt(expectedDayEnd);
      const dayStart = parseInt(expectedDayStart);
      if (isNaN(dayEnd) || dayEnd < 1 || dayEnd > 31) {
        newErrors.expectedDayEnd = 'Dia deve estar entre 1 e 31';
      } else if (!isNaN(dayStart) && dayEnd < dayStart) {
        newErrors.expectedDayEnd = 'Dia final deve ser maior ou igual ao inicial';
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

    const parsedAmountMin = parseFloat(amountMin);
    const parsedAmountMax = useSingleAmount ? parsedAmountMin : parseFloat(amountMax);
    const parsedDayStart = expectedDayStart ? parseInt(expectedDayStart) : undefined;
    const parsedDayEnd = useSingleDay ? parsedDayStart : (expectedDayEnd ? parseInt(expectedDayEnd) : undefined);

    onSubmit({
      category_id: parseInt(categoryId),
      description: description.trim(),
      amount: parsedAmountMax, // Display amount is the max
      amount_min: parsedAmountMin,
      amount_max: parsedAmountMax,
      expected_day_start: parsedDayStart,
      expected_day_end: parsedDayEnd || parsedDayStart,
      entry_type: entryType,
      is_recurrent: isRecurrent,
      is_saved_pattern: isSavedPattern,
      description_pattern: isSavedPattern ? descriptionPattern.trim() : undefined,
    });
  };

  const handleAmountChange = (value: string, setter: (v: string) => void, errorKey: 'amountMin' | 'amountMax') => {
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
      if (errors[errorKey]) {
        setErrors({ ...errors, [errorKey]: undefined });
      }
    }
  };

  const handleDayChange = (value: string, setter: (v: string) => void, errorKey: 'expectedDayStart' | 'expectedDayEnd') => {
    // Allow only numbers
    if (value === '' || /^\d+$/.test(value)) {
      setter(value);
      if (errors[errorKey]) {
        setErrors({ ...errors, [errorKey]: undefined });
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
      {/* Entry Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Entrada *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="entryType"
              value="expense"
              checked={entryType === 'expense'}
              onChange={() => setEntryType('expense')}
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Despesa</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="entryType"
              value="income"
              checked={entryType === 'income'}
              onChange={() => setEntryType('income')}
              disabled={isLoading}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Receita</span>
          </label>
        </div>
      </div>

      {/* Category Dropdown */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Categoria *
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
          <option value="">Selecione uma categoria</option>
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
          Descrição *
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
          placeholder="Ex: Netflix, Aluguel, Salário"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Amount Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Valor {useSingleAmount ? '*' : 'Mínimo *'}
          </label>
          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={!useSingleAmount}
              onChange={(e) => {
                setUseSingleAmount(!e.target.checked);
                if (!e.target.checked) {
                  setAmountMax(amountMin);
                }
              }}
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
            />
            Usar faixa de valor
          </label>
        </div>

        <div className={`grid gap-3 ${useSingleAmount ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">R$</span>
            <input
              type="text"
              value={amountMin}
              onChange={(e) => handleAmountChange(e.target.value, setAmountMin, 'amountMin')}
              disabled={isLoading}
              placeholder="0.00"
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.amountMin ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.amountMin && (
              <p className="mt-1 text-sm text-red-600">{errors.amountMin}</p>
            )}
          </div>

          {!useSingleAmount && (
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">R$</span>
              <input
                type="text"
                value={amountMax}
                onChange={(e) => handleAmountChange(e.target.value, setAmountMax, 'amountMax')}
                disabled={isLoading}
                placeholder="0.00"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.amountMax ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.amountMax && (
                <p className="mt-1 text-sm text-red-600">{errors.amountMax}</p>
              )}
            </div>
          )}
        </div>

        {amountMin && !errors.amountMin && (
          <p className="text-sm text-gray-600">
            {useSingleAmount
              ? `Valor: ${formatCurrencyPreview(amountMin)}`
              : `Faixa: ${formatCurrencyPreview(amountMin)} - ${formatCurrencyPreview(amountMax || amountMin)}`
            }
            {!useSingleAmount && (
              <span className="text-xs text-blue-600 ml-2">
                (orçamento usa valor máximo)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Expected Day Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Dia Esperado {useSingleDay ? '' : 'Inicial'}
          </label>
          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={!useSingleDay}
              onChange={(e) => {
                setUseSingleDay(!e.target.checked);
                if (!e.target.checked) {
                  setExpectedDayEnd(expectedDayStart);
                }
              }}
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
            />
            Usar período (faixa de dias)
          </label>
        </div>

        <div className={`grid gap-3 ${useSingleDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div>
            <input
              type="text"
              value={expectedDayStart}
              onChange={(e) => handleDayChange(e.target.value, setExpectedDayStart, 'expectedDayStart')}
              disabled={isLoading}
              placeholder={useSingleDay ? "Ex: 15" : "Dia inicial"}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.expectedDayStart ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.expectedDayStart && (
              <p className="mt-1 text-sm text-red-600">{errors.expectedDayStart}</p>
            )}
          </div>

          {!useSingleDay && (
            <div>
              <input
                type="text"
                value={expectedDayEnd}
                onChange={(e) => handleDayChange(e.target.value, setExpectedDayEnd, 'expectedDayEnd')}
                disabled={isLoading}
                placeholder="Dia final"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.expectedDayEnd ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.expectedDayEnd && (
                <p className="mt-1 text-sm text-red-600">{errors.expectedDayEnd}</p>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          {useSingleDay
            ? 'Opcional: Dia do mês esperado para esta entrada'
            : 'Opcional: Período esperado (ex: dia 14 a 18 do mês)'
          }
        </p>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2 pt-2 border-t border-gray-200">
        <div className="flex items-center pt-2">
          <input
            id="isRecurrent"
            type="checkbox"
            checked={isRecurrent}
            onChange={(e) => setIsRecurrent(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <label htmlFor="isRecurrent" className="ml-2 text-sm text-gray-700">
            Entrada recorrente (aparece todo mês)
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
            Criar padrão para auto-matching
          </label>
        </div>

        {/* Description Pattern Field - shown when isSavedPattern is checked */}
        {isSavedPattern && (
          <div className="ml-6 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <label
              htmlFor="descriptionPattern"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Padrão de Descrição *
            </label>
            <input
              id="descriptionPattern"
              type="text"
              value={descriptionPattern}
              onChange={(e) => {
                setDescriptionPattern(e.target.value);
                if (errors.descriptionPattern) {
                  setErrors({ ...errors, descriptionPattern: undefined });
                }
              }}
              disabled={isLoading}
              placeholder="Ex: NETFLIX, PIX RECEBIDO"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.descriptionPattern ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <p className="mt-1 text-xs text-gray-600">
              Texto que será buscado na descrição das transações para auto-matching.
              Ex: "NETFLIX" irá corresponder a "NETFLIX.COM" ou "PAGAMENTO NETFLIX".
            </p>
            {errors.descriptionPattern && (
              <p className="mt-1 text-sm text-red-600">{errors.descriptionPattern}</p>
            )}
          </div>
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
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Salvando...' : initialEntry ? 'Atualizar' : 'Criar Entrada'}
        </button>
      </div>
    </form>
  );
}
