import { useState, useEffect, useMemo, useRef } from 'react';
import type { Category } from '../types/category';
import type { Transaction } from '../types/transaction';
import type { PlannedEntry, CreatePlannedEntryRequest } from '../types/budget';

interface PlannedEntryFormProps {
  categories: Category[];
  transactions?: Transaction[]; // For pattern autocomplete
  transactionsLoading?: boolean; // Loading state for transactions
  onSubmit: (data: CreatePlannedEntryRequest) => void;
  onCancel: () => void;
  initialEntry?: PlannedEntry;
  isLoading?: boolean;
}

// Match scoring function - returns a score (higher = better match)
// Returns 0 if no match, 1 for fuzzy, 2 for contains, 3 for exact word match
function getMatchScore(text: string, query: string): number {
  if (!query.trim()) return 1; // No query = all match equally

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase().trim();

  // Exact match or starts with query = highest priority
  if (textLower === queryLower || textLower.startsWith(queryLower + ' ') || textLower.startsWith(queryLower)) {
    return 4;
  }

  // Contains the exact word (surrounded by spaces or at boundaries)
  const wordBoundaryRegex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[^a-zA-Z0-9])`, 'i');
  if (wordBoundaryRegex.test(text)) {
    return 3;
  }

  // Contains as substring
  if (textLower.includes(queryLower)) {
    return 2;
  }

  // Fuzzy match - all characters appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  if (queryIndex === queryLower.length) {
    return 1;
  }

  return 0; // No match
}

// Get unique descriptions from transactions
function getUniqueDescriptions(transactions: Transaction[]): { description: string; count: number; example: Transaction }[] {
  const descMap = new Map<string, { count: number; example: Transaction }>();

  for (const tx of transactions) {
    const desc = tx.original_description || tx.description;
    const existing = descMap.get(desc);
    if (existing) {
      existing.count++;
    } else {
      descMap.set(desc, { count: 1, example: tx });
    }
  }

  return Array.from(descMap.entries())
    .map(([description, data]) => ({ description, ...data }))
    .sort((a, b) => b.count - a.count); // Sort by frequency
}

export default function PlannedEntryForm({
  categories,
  transactions = [],
  transactionsLoading = false,
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
  const [showPatternDropdown, setShowPatternDropdown] = useState(false);
  const patternInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get unique transaction descriptions for autocomplete
  const uniqueDescriptions = useMemo(() => getUniqueDescriptions(transactions), [transactions]);

  // Filter and sort descriptions based on pattern input
  const filteredDescriptions = useMemo(() => {
    if (!descriptionPattern.trim()) {
      return uniqueDescriptions.slice(0, 15); // Show top 15 most frequent
    }

    // Score each item and filter out non-matches
    const scoredItems = uniqueDescriptions
      .map(item => ({
        ...item,
        score: getMatchScore(item.description, descriptionPattern),
      }))
      .filter(item => item.score > 0);

    // Sort by score (descending), then by frequency (descending)
    scoredItems.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.count - a.count;
    });

    return scoredItems.slice(0, 15);
  }, [uniqueDescriptions, descriptionPattern]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        patternInputRef.current &&
        !patternInputRef.current.contains(event.target as Node)
      ) {
        setShowPatternDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <div className="relative">
              <input
                ref={patternInputRef}
                id="descriptionPattern"
                type="text"
                value={descriptionPattern}
                onChange={(e) => {
                  setDescriptionPattern(e.target.value);
                  setShowPatternDropdown(true);
                  if (errors.descriptionPattern) {
                    setErrors({ ...errors, descriptionPattern: undefined });
                  }
                }}
                onFocus={() => setShowPatternDropdown(true)}
                disabled={isLoading}
                placeholder="Digite para buscar nas transações..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.descriptionPattern ? 'border-red-500' : 'border-gray-300'
                }`}
              />

              {/* Transaction Dropdown */}
              {showPatternDropdown && transactions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                >
                  <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b sticky top-0">
                    {filteredDescriptions.length > 0
                      ? `${filteredDescriptions.length} transações encontradas - clique para usar`
                      : 'Nenhuma transação encontrada'
                    }
                  </div>
                  {filteredDescriptions.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      title={item.description}
                      onClick={() => {
                        setDescriptionPattern(item.description);
                        setShowPatternDropdown(false);
                        if (errors.descriptionPattern) {
                          setErrors({ ...errors, descriptionPattern: undefined });
                        }
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm text-gray-900 truncate flex-1 mr-2 group-hover:whitespace-normal group-hover:break-words"
                          title={item.description}
                        >
                          {item.description}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {item.count}x
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${item.example.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(item.example.amount))}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.example.transaction_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </button>
                  ))}
                  {filteredDescriptions.length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                      Nenhuma transação corresponde ao filtro
                    </div>
                  )}
                </div>
              )}

              {/* Show loading state when fetching transactions */}
              {showPatternDropdown && transactionsLoading && (
                <div className="absolute z-20 w-full mt-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Carregando transações...
                </div>
              )}

              {/* Show hint when no transactions and not loading */}
              {showPatternDropdown && !transactionsLoading && transactions.length === 0 && (
                <div className="absolute z-20 w-full mt-1 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                  ⚠️ Nenhuma transação carregada. Digite o padrão manualmente.
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-600">
              Selecione uma transação acima ou digite um padrão manualmente.
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
