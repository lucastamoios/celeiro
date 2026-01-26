import { useState, useEffect } from 'react';
import type { Category } from '../types/category';
import type { PlannedEntry } from '../types/budget';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import { useModalDismiss } from '../hooks/useModalDismiss';

export interface InitialPatternData {
  description: string;
  categoryId?: number;
  amount?: string;
  expectedDay?: number;
}

export interface ExistingPattern {
  description_pattern: string;
  date_pattern?: string;
  weekday_pattern?: string;
  amount_min?: string;
  amount_max?: string;
  target_description: string;
  target_category_id: number;
  linked_planned_entry_id?: number;
}

interface PatternCreatorProps {
  categories: Map<number, Category>;
  onClose: () => void;
  onSave: (pattern: AdvancedPattern) => Promise<void>;
  initialData?: InitialPatternData;
  existingPattern?: ExistingPattern;
}

export interface AdvancedPattern {
  description_pattern: string;
  date_pattern?: string;
  weekday_pattern?: string;
  amount_range?: { min: number; max: number };
  target_description: string;
  target_category_id: number;
  planned_entry_id?: number; // Optional: link to a planned entry
}

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Helper to extract simple text from a regex pattern like .*text.*
function extractSimpleText(pattern: string): string {
  // Try to extract text from patterns like .*text.* or ^.*text.*$
  const match = pattern.match(/^\^?\.\*(.+?)\.\*\$?$/);
  if (match) return match[1];

  // If it's a simple pattern without .* wrappers, return as is
  if (!pattern.includes('.*') && !pattern.includes('^') && !pattern.includes('$')) {
    return pattern;
  }

  // Otherwise return empty (user is using advanced regex)
  return '';
}

// Helper to check if a pattern is "advanced" (not just .*text.*)
function isAdvancedPattern(pattern: string): boolean {
  if (!pattern) return false;
  const simpleText = extractSimpleText(pattern);
  // If we couldn't extract simple text, it's advanced
  if (!simpleText && pattern) return true;
  // Check for regex special characters (excluding the .* wrapper)
  const inner = pattern.replace(/^\^?\.\*/, '').replace(/\.\*\$?$/, '');
  return /[\\^$*+?.()|[\]{}]/.test(inner);
}

export default function PatternCreator({
  categories,
  onClose,
  onSave,
  initialData,
  existingPattern
}: PatternCreatorProps) {
  const { token } = useAuth();

  // Determine initial values
  const existingDescPattern = existingPattern?.description_pattern || '';
  const isEditingAdvanced = isAdvancedPattern(existingDescPattern);

  // Simple mode: text that the description should contain
  const [simpleDescriptionText, setSimpleDescriptionText] = useState(
    existingPattern
      ? extractSimpleText(existingDescPattern) || ''
      : '' // Start empty - user types the bank transaction keyword
  );

  // Advanced mode: full regex pattern
  const [descriptionPattern, setDescriptionPattern] = useState(
    existingPattern?.description_pattern || '' // Start empty - user types the pattern
  );

  // Track if user is in advanced mode
  const [showAdvanced, setShowAdvanced] = useState(isEditingAdvanced);
  const [useRegex, setUseRegex] = useState(isEditingAdvanced);

  // Optional advanced fields - start empty unless editing existing pattern
  const [datePattern, setDatePattern] = useState(existingPattern?.date_pattern || '');
  const [weekdayPattern] = useState(existingPattern?.weekday_pattern || '');
  const [amountMin, setAmountMin] = useState(existingPattern?.amount_min || '');
  const [amountMax, setAmountMax] = useState(existingPattern?.amount_max || '');

  // Target fields
  const [targetDescription, setTargetDescription] = useState(
    existingPattern?.target_description ||
    initialData?.description ||
    ''
  );
  const [targetCategoryId, setTargetCategoryId] = useState(
    existingPattern ? String(existingPattern.target_category_id) :
    (initialData?.categoryId ? String(initialData.categoryId) : '')
  );

  // Planned entry linking
  const [linkToPlannedEntry, setLinkToPlannedEntry] = useState(!!existingPattern?.linked_planned_entry_id);
  const [plannedEntries, setPlannedEntries] = useState<PlannedEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [selectedPlannedEntryId, setSelectedPlannedEntryId] = useState<number | null>(
    existingPattern?.linked_planned_entry_id || null
  );
  const [plannedEntrySearch, setPlannedEntrySearch] = useState('');

  // Parse weekdays from existing pattern
  const parseWeekdaysFromPattern = (pattern?: string): number[] => {
    if (!pattern) return [];
    const match = pattern.match(/\((\d+(?:\|\d+)*)\)/);
    if (match) {
      return match[1].split('|').map(Number);
    }
    return [];
  };

  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    parseWeekdaysFromPattern(existingPattern?.weekday_pattern)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropMouseDown } = useModalDismiss(onClose);

  // Fetch planned entries when linking is enabled
  useEffect(() => {
    if (!linkToPlannedEntry || !token) return;

    const fetchPlannedEntries = async () => {
      setLoadingEntries(true);
      try {
        const response = await fetch(financialUrl('planned-entries?is_active=true'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        });
        if (response.ok) {
          const result = await response.json();
          // Filter out entries that already have a pattern linked (unless it's the current one)
          const entries = (result.data || []).filter((e: PlannedEntry) =>
            !e.PatternID || e.PatternID === existingPattern?.linked_planned_entry_id
          );
          setPlannedEntries(entries);
        }
      } catch (err) {
        console.error('Failed to fetch planned entries:', err);
      } finally {
        setLoadingEntries(false);
      }
    };

    fetchPlannedEntries();
  }, [linkToPlannedEntry, token, existingPattern?.linked_planned_entry_id]);

  // Sync description pattern when simple text changes (only in simple mode)
  useEffect(() => {
    if (!useRegex && simpleDescriptionText) {
      setDescriptionPattern(`.*${simpleDescriptionText}.*`);
    }
  }, [simpleDescriptionText, useRegex]);

  // When a planned entry is selected, auto-fill target description and category
  const handleSelectPlannedEntry = (entryId: number) => {
    setSelectedPlannedEntryId(entryId);
    const entry = plannedEntries.find(e => e.PlannedEntryID === entryId);
    if (entry) {
      setTargetDescription(entry.Description);
      setTargetCategoryId(String(entry.CategoryID));
    }
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setError(null);

    // Get the final description pattern
    const finalDescPattern = useRegex
      ? descriptionPattern
      : (simpleDescriptionText ? `.*${simpleDescriptionText}.*` : '');

    // Validation
    if (!finalDescPattern.trim()) {
      setError('Digite o texto que a descrição deve conter');
      return;
    }

    if (!targetDescription.trim()) {
      setError('A descrição de destino é obrigatória');
      return;
    }

    if (!targetCategoryId) {
      setError('A categoria de destino é obrigatória');
      return;
    }

    if (linkToPlannedEntry && !selectedPlannedEntryId) {
      setError('Selecione uma entrada planejada para vincular');
      return;
    }

    setSaving(true);

    try {
      const pattern: AdvancedPattern = {
        description_pattern: finalDescPattern,
        date_pattern: datePattern || undefined,
        weekday_pattern: selectedWeekdays.length > 0
          ? `(${selectedWeekdays.join('|')})`
          : weekdayPattern || undefined,
        amount_range: amountMin && amountMax ? {
          min: parseFloat(amountMin),
          max: parseFloat(amountMax),
        } : undefined,
        target_description: targetDescription,
        target_category_id: parseInt(targetCategoryId),
        planned_entry_id: linkToPlannedEntry ? selectedPlannedEntryId || undefined : undefined,
      };

      await onSave(pattern);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar padrão');
    } finally {
      setSaving(false);
    }
  };

  // Generate the full pattern string for preview
  const generateFullPattern = () => {
    const parts = [];
    const descPart = useRegex ? descriptionPattern : (simpleDescriptionText ? `.*${simpleDescriptionText}.*` : '.*');
    parts.push(descPart || '.*');
    parts.push(datePattern || '.*');
    parts.push(selectedWeekdays.length > 0 ? `(${selectedWeekdays.join('|')})` : weekdayPattern || '.*');
    if (amountMin && amountMax) {
      parts.push(`<<${amountMin}-${amountMax}>>`);
    } else {
      parts.push('.*');
    }
    return parts.join('\\n');
  };

  // Check if any advanced options are configured
  const hasAdvancedConfig = datePattern || weekdayPattern || selectedWeekdays.length > 0 || amountMin || amountMax;

  // Filter planned entries by search
  const filteredPlannedEntries = plannedEntries.filter(entry =>
    entry.Description.toLowerCase().includes(plannedEntrySearch.toLowerCase())
  );

  // Format currency for display
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(amount));
  };

  return (
    <div
      className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-wheat-50 to-wheat-100">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              {existingPattern
                ? '✏️ Editar Padrão'
                : '🎯 Criar Padrão de Categorização'}
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Crie regras para categorizar transações automaticamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 bg-rust-50 border border-rust-200 rounded-lg p-3">
            <p className="text-sm text-rust-800">⚠️ {error}</p>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: What to match */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide">
              Quando encontrar...
            </h3>

            {/* Simple description input */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Texto do banco (para encontrar)
              </label>
              {useRegex ? (
                <input
                  type="text"
                  value={descriptionPattern}
                  onChange={(e) => setDescriptionPattern(e.target.value)}
                  placeholder="Ex: .*NETFLIX.* ou ^PIX.*MERCADO"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 font-mono text-sm"
                />
              ) : (
                <input
                  type="text"
                  value={simpleDescriptionText}
                  onChange={(e) => setSimpleDescriptionText(e.target.value)}
                  placeholder="Ex: Netflix, Amazon, Mercado..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500"
                />
              )}
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-stone-500">
                  {useRegex
                    ? 'Usando regex para correspondência avançada'
                    : 'Transações que contêm este texto serão correspondidas'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUseRegex(!useRegex);
                    if (!useRegex && simpleDescriptionText) {
                      // Switching to regex - initialize with current simple pattern
                      setDescriptionPattern(`.*${simpleDescriptionText}.*`);
                    }
                  }}
                  className="text-xs text-wheat-600 hover:text-wheat-700 font-medium"
                >
                  {useRegex ? '← Modo simples' : 'Usar regex →'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: What to apply */}
          <div className="space-y-4 pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide">
                Aplicar...
              </h3>

              {/* Toggle between manual and planned entry */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLinkToPlannedEntry(false);
                    setSelectedPlannedEntryId(null);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    !linkToPlannedEntry
                      ? 'bg-wheat-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setLinkToPlannedEntry(true)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    linkToPlannedEntry
                      ? 'bg-wheat-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  📋 Entrada Planejada
                </button>
              </div>
            </div>

            {linkToPlannedEntry ? (
              /* Planned Entry Selection */
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Buscar entrada planejada
                  </label>
                  <input
                    type="text"
                    value={plannedEntrySearch}
                    onChange={(e) => setPlannedEntrySearch(e.target.value)}
                    placeholder="Digite para filtrar..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 text-sm"
                  />
                </div>

                {loadingEntries ? (
                  <div className="py-4 text-center text-stone-500">
                    <svg className="animate-spin h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Carregando entradas...
                  </div>
                ) : filteredPlannedEntries.length === 0 ? (
                  <div className="py-4 text-center text-stone-500 text-sm">
                    {plannedEntries.length === 0
                      ? 'Nenhuma entrada planejada disponível'
                      : 'Nenhuma entrada encontrada'}
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100">
                    {filteredPlannedEntries.map(entry => {
                      const category = categories.get(entry.CategoryID);
                      const isSelected = selectedPlannedEntryId === entry.PlannedEntryID;

                      return (
                        <button
                          key={entry.PlannedEntryID}
                          type="button"
                          onClick={() => handleSelectPlannedEntry(entry.PlannedEntryID)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                            isSelected
                              ? 'bg-wheat-50 border-l-4 border-wheat-500'
                              : 'hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-stone-900 truncate">
                              {entry.Description}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <span className="inline-flex items-center gap-1">
                                {category?.icon} {category?.name}
                              </span>
                              <span className="tabular-nums">{formatCurrency(entry.Amount)}</span>
                              {entry.IsRecurrent && (
                                <span className="px-1.5 py-0.5 bg-wheat-100 text-wheat-700 rounded">
                                  Recorrente
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <svg className="w-5 h-5 text-wheat-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Show selected entry info */}
                {selectedPlannedEntryId && (
                  <div className="bg-wheat-50 rounded-lg p-3 border border-wheat-200">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-wheat-700 font-medium">📋 Entrada selecionada:</span>
                      <span className="text-stone-900">{targetDescription}</span>
                      {categories.has(parseInt(targetCategoryId)) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-wheat-100 text-wheat-800 rounded-full">
                          {categories.get(parseInt(targetCategoryId))!.icon}
                          {categories.get(parseInt(targetCategoryId))!.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-wheat-600 mt-1">
                      O padrão será vinculado a esta entrada para auto-match
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Manual Entry */
              <>
                {/* Target Description */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Como deve aparecer (renomear para)
                  </label>
                  <input
                    type="text"
                    value={targetDescription}
                    onChange={(e) => setTargetDescription(e.target.value)}
                    placeholder="Ex: Netflix, Compras Amazon..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Nome limpo que aparecerá na transação
                  </p>
                </div>

                {/* Target Category */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={targetCategoryId}
                    onChange={(e) => setTargetCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500"
                  >
                    <option value="">Selecione uma categoria</option>
                    {Array.from(categories.values()).map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Section 3: Advanced Options (Collapsible) */}
          <div className="pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Opções avançadas</span>
              {hasAdvancedConfig && !showAdvanced && (
                <span className="text-xs bg-wheat-100 text-wheat-700 px-2 py-0.5 rounded-full">
                  configurado
                </span>
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 pl-6 border-l-2 border-stone-200">
                {/* Weekdays */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Dias da semana (opcional)
                  </label>
                  <div className="flex gap-1">
                    {WEEKDAY_NAMES.map((name, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleWeekday(idx)}
                        className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                          selectedWeekdays.includes(idx)
                            ? 'bg-wheat-600 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Só corresponde em dias específicos da semana
                  </p>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Faixa de valor (opcional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value)}
                      placeholder="Mínimo"
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 text-sm"
                    />
                    <span className="text-stone-400 text-sm">até</span>
                    <input
                      type="number"
                      step="0.01"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value)}
                      placeholder="Máximo"
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 text-sm"
                    />
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Só corresponde valores dentro desta faixa
                  </p>
                </div>

                {/* Date Pattern */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Padrão de data (opcional)
                  </label>
                  <input
                    type="text"
                    value={datePattern}
                    onChange={(e) => setDatePattern(e.target.value)}
                    placeholder="Ex: .*-15 (dia 15) ou 2024-12-.*"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 font-mono text-sm"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Regex para o formato YYYY-MM-DD
                  </p>
                </div>

                {/* Full Pattern Preview */}
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
                      Padrão completo
                    </h4>
                  </div>
                  <pre className="bg-white p-2 rounded border border-stone-300 text-xs font-mono overflow-x-auto text-stone-700">
{generateFullPattern()}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Preview Card */}
          {targetDescription && targetCategoryId && (
            <div className="bg-sage-50 rounded-lg p-4 border border-sage-200">
              <h4 className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-2">
                Preview
              </h4>
              <div className="bg-white rounded-lg p-3 border border-sage-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-stone-900 font-medium">{targetDescription}</span>
                  {categories.has(parseInt(targetCategoryId)) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-wheat-100 text-wheat-800 rounded-full">
                      {categories.get(parseInt(targetCategoryId))!.icon}
                      {categories.get(parseInt(targetCategoryId))!.name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-sage-600 font-medium">✓ Categorizado</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-3 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!useRegex && !simpleDescriptionText) || (useRegex && !descriptionPattern) || !targetDescription || !targetCategoryId || (linkToPlannedEntry && !selectedPlannedEntryId)}
            className="px-6 py-2 bg-gradient-to-r from-wheat-500 to-wheat-600 text-white rounded-lg hover:from-wheat-600 hover:to-wheat-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </span>
            ) : existingPattern ? (
              'Salvar Alterações'
            ) : (
              'Criar Padrão'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
