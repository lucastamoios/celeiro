import { useState, useEffect } from 'react';
import type { Category } from '../types/category';
import type { PlannedEntry, CreatePlannedEntryRequest } from '../types/budget';
import type { SavingsGoal } from '../types/savingsGoals';
import PatternCreator, { type AdvancedPattern as AdvancedPatternInput } from './PatternCreator';
import TagSelector from './TagSelector';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { financialUrl } from '../config/api';

interface PlannedEntryFormProps {
  categories: Category[];
  savingsGoals?: SavingsGoal[]; // For goal selector
  onSubmit: (data: CreatePlannedEntryRequest) => void;
  onCancel: () => void;
  initialEntry?: PlannedEntry;
  isLoading?: boolean;
}

export default function PlannedEntryForm({
  categories,
  savingsGoals = [],
  onSubmit,
  onCancel,
  initialEntry,
  isLoading = false,
}: PlannedEntryFormProps) {
  const { token } = useAuth();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization_id?.toString() || '1';

  // Advanced pattern creation state
  const [showAdvancedPatternModal, setShowAdvancedPatternModal] = useState(false);
  const [linkedPatternId, setLinkedPatternId] = useState<number | null>(
    initialEntry?.PatternID || null
  );
  const [linkedPatternName, setLinkedPatternName] = useState<string>('');


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

  // Savings goal state
  const [savingsGoalId, setSavingsGoalId] = useState<string>(
    initialEntry?.SavingsGoalID?.toString() || ''
  );

  // Tags state
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    initialEntry?.TagIDs || []
  );

  const [errors, setErrors] = useState<{
    categoryId?: string;
    description?: string;
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
      setSavingsGoalId(initialEntry.SavingsGoalID?.toString() || '');
      setSelectedTagIds(initialEntry.TagIDs || []);
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
      pattern_id: linkedPatternId || undefined,
      savings_goal_id: savingsGoalId ? parseInt(savingsGoalId) : undefined,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    });
  };

  // Handler for saving an advanced pattern
  const handleSaveAdvancedPattern = async (pattern: AdvancedPatternInput) => {
    if (!token) return;

    const response = await fetch(financialUrl('patterns'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Active-Organization': organizationId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...pattern,
        apply_retroactively: true, // Apply to existing transactions
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to create pattern');
    }

    const result = await response.json();
    const createdPattern = result.data;

    // Store the pattern info and close modal
    setLinkedPatternId(createdPattern.pattern_id);
    setLinkedPatternName(createdPattern.target_description || pattern.target_description);
    setShowAdvancedPatternModal(false);
  };

  // Quick pattern creation - creates a simple "contains" pattern with one click


  // Clear linked pattern
  const handleClearLinkedPattern = () => {
    setLinkedPatternId(null);
    setLinkedPatternName('');
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
        <label className="block text-sm font-medium text-stone-700 mb-2">
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
              className="h-4 w-4 text-wheat-600 focus:ring-wheat-500 border-stone-300"
            />
            <span className="ml-2 text-sm text-stone-700">Despesa</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="entryType"
              value="income"
              checked={entryType === 'income'}
              onChange={() => setEntryType('income')}
              disabled={isLoading}
              className="h-4 w-4 text-sage-600 focus:ring-sage-500 border-stone-300"
            />
            <span className="ml-2 text-sm text-stone-700">Receita</span>
          </label>
        </div>
      </div>

      {/* Category Dropdown */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-stone-700 mb-1"
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
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 disabled:bg-stone-100 disabled:cursor-not-allowed ${
            errors.categoryId ? 'border-rust-500' : 'border-stone-300'
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
          <p className="mt-1 text-sm text-rust-600">{errors.categoryId}</p>
        )}
      </div>

      {/* Description Input */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-stone-700 mb-1"
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
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 disabled:bg-stone-100 disabled:cursor-not-allowed ${
            errors.description ? 'border-rust-500' : 'border-stone-300'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-rust-600">{errors.description}</p>
        )}
      </div>

      {/* Amount Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-stone-700">
            Valor {useSingleAmount ? '*' : 'Mínimo *'}
          </label>
          <label className="flex items-center text-sm text-stone-600">
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
              className="h-4 w-4 text-wheat-600 focus:ring-wheat-500 border-stone-300 rounded mr-2"
            />
            Usar faixa de valor
          </label>
        </div>

        <div className={`grid gap-3 ${useSingleAmount ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="relative">
            <span className="absolute left-3 top-2 text-stone-500">R$</span>
            <input
              type="text"
              value={amountMin}
              onChange={(e) => handleAmountChange(e.target.value, setAmountMin, 'amountMin')}
              disabled={isLoading}
              placeholder="0.00"
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 disabled:bg-stone-100 disabled:cursor-not-allowed ${
                errors.amountMin ? 'border-rust-500' : 'border-stone-300'
              }`}
            />
            {errors.amountMin && (
              <p className="mt-1 text-sm text-rust-600">{errors.amountMin}</p>
            )}
          </div>

          {!useSingleAmount && (
            <div className="relative">
              <span className="absolute left-3 top-2 text-stone-500">R$</span>
              <input
                type="text"
                value={amountMax}
                onChange={(e) => handleAmountChange(e.target.value, setAmountMax, 'amountMax')}
                disabled={isLoading}
                placeholder="0.00"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 disabled:bg-stone-100 disabled:cursor-not-allowed ${
                  errors.amountMax ? 'border-rust-500' : 'border-stone-300'
                }`}
              />
              {errors.amountMax && (
                <p className="mt-1 text-sm text-rust-600">{errors.amountMax}</p>
              )}
            </div>
          )}
        </div>

        {amountMin && !errors.amountMin && (
          <p className="text-sm text-stone-600">
            {useSingleAmount
              ? `Valor: ${formatCurrencyPreview(amountMin)}`
              : `Faixa: ${formatCurrencyPreview(amountMin)} - ${formatCurrencyPreview(amountMax || amountMin)}`
            }
            {!useSingleAmount && (
              <span className="text-xs text-wheat-600 ml-2">
                (orçamento usa valor máximo)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Expected Day Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-stone-700">
            Dia Esperado {useSingleDay ? '' : 'Inicial'}
          </label>
          <label className="flex items-center text-sm text-stone-600">
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
              className="h-4 w-4 text-wheat-600 focus:ring-wheat-500 border-stone-300 rounded mr-2"
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 disabled:bg-stone-100 disabled:cursor-not-allowed ${
                errors.expectedDayStart ? 'border-rust-500' : 'border-stone-300'
              }`}
            />
            {errors.expectedDayStart && (
              <p className="mt-1 text-sm text-rust-600">{errors.expectedDayStart}</p>
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 disabled:bg-stone-100 disabled:cursor-not-allowed ${
                  errors.expectedDayEnd ? 'border-rust-500' : 'border-stone-300'
                }`}
              />
              {errors.expectedDayEnd && (
                <p className="mt-1 text-sm text-rust-600">{errors.expectedDayEnd}</p>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-stone-500">
          {useSingleDay
            ? 'Opcional: Dia do mês esperado para esta entrada'
            : 'Opcional: Período esperado (ex: dia 14 a 18 do mês)'
          }
        </p>
      </div>

      {/* Options Section */}
      <div className="space-y-3 pt-4 border-t border-stone-200">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Opções</p>

        <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
          <input
            id="isRecurrent"
            type="checkbox"
            checked={isRecurrent}
            onChange={(e) => setIsRecurrent(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 text-wheat-600 focus:ring-wheat-500 border-stone-300 rounded disabled:opacity-50"
          />
          <div>
            <span className="text-sm font-medium text-stone-700">Entrada recorrente</span>
            <p className="text-xs text-stone-500">Aparece automaticamente todo mês</p>
          </div>
        </label>

        {/* Savings Goal Selector */}
        {savingsGoals.length > 0 && (
          <div className="p-3 bg-stone-50 rounded-lg">
            <label
              htmlFor="savingsGoal"
              className="block text-sm font-medium text-stone-700 mb-2"
            >
              🎯 Vincular a uma meta
            </label>
            <select
              id="savingsGoal"
              value={savingsGoalId}
              onChange={(e) => setSavingsGoalId(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 disabled:bg-stone-100 disabled:cursor-not-allowed text-sm"
            >
              <option value="">Nenhuma meta</option>
              {savingsGoals
                .filter(goal => goal.is_active && !goal.is_completed)
                .map((goal) => (
                <option key={goal.savings_goal_id} value={goal.savings_goal_id}>
                  {goal.icon || '🎯'} {goal.name} (Meta: R$ {parseFloat(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-500 mt-1">
              Transações que corresponderem a esta entrada serão automaticamente vinculadas à meta
            </p>
          </div>
        )}

        {/* Tag Selector */}
        <div className="p-3 bg-stone-50 rounded-lg">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            🏷️ Tags
          </label>
          <TagSelector
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
            disabled={isLoading}
          />
          <p className="text-xs text-stone-500 mt-2">
            Tags serão automaticamente aplicadas às transações que corresponderem a esta entrada
          </p>
        </div>

        {/* Linked Advanced Pattern indicator - shown when we have a linked pattern (both create and edit mode) */}
        {linkedPatternId && (
          <div className="p-3 bg-stone-100 rounded-lg border border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-stone-800">
                    Padrão Avançado Vinculado
                  </span>
                  {linkedPatternName && (
                    <p className="text-xs text-stone-600">{linkedPatternName}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearLinkedPattern}
                className="text-xs text-stone-600 hover:text-stone-800 underline"
              >
                Remover
              </button>
            </div>
          </div>
        )}

        {/* Pattern Creation - available when no pattern is linked */}
        {!linkedPatternId && (
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
            <div>
              <span className="text-sm font-medium text-stone-700">Padrão de Auto-Matching</span>
              <p className="text-xs text-stone-500">
                Transações do banco que contenham "<span className="font-medium">{description || '...'}</span>" serão
                renomeadas para "<span className="font-medium">{description || '...'}</span>" e categorizadas automaticamente
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedPatternModal(true)}
              disabled={isLoading || !categoryId || !description}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-wheat-500 to-wheat-600 rounded-lg hover:from-wheat-600 hover:to-wheat-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              🎯 Criar Padrão Avançado
            </button>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-white bg-gradient-to-r from-wheat-500 to-wheat-600 rounded-lg hover:from-wheat-600 hover:to-wheat-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? 'Salvando...' : initialEntry ? 'Atualizar' : 'Criar Entrada'}
        </button>
      </div>

      {/* Advanced Pattern Creator Modal */}
      {showAdvancedPatternModal && (
        <PatternCreator
          categories={new Map(categories.map(c => [c.category_id, c]))}
          onClose={() => setShowAdvancedPatternModal(false)}
          onSave={handleSaveAdvancedPattern}
          initialData={{
            description: description,
            categoryId: categoryId ? parseInt(categoryId) : undefined,
            amount: amountMin || amountMax,
          }}
        />
      )}
    </form>
  );
}
