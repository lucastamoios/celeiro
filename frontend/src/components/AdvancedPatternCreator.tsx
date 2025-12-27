import { useState } from 'react';
import type { Category } from '../types/category';

export interface InitialPatternData {
  description: string;
  categoryId: number;
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
}

interface AdvancedPatternCreatorProps {
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
}

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function AdvancedPatternCreator({ categories, onClose, onSave, initialData, existingPattern }: AdvancedPatternCreatorProps) {
  // Pattern fields - pre-fill with existing pattern or initial data
  const [descriptionPattern, setDescriptionPattern] = useState(
    existingPattern?.description_pattern || 
    (initialData?.description ? `.*${initialData.description}.*` : '')
  );
  const [datePattern, setDatePattern] = useState(
    existingPattern?.date_pattern || 
    (initialData?.expectedDay ? `.*-${String(initialData.expectedDay).padStart(2, '0')}` : '')
  );
  const [weekdayPattern, setWeekdayPattern] = useState(existingPattern?.weekday_pattern || '');
  const [amountMin, setAmountMin] = useState(
    existingPattern?.amount_min || 
    (initialData?.amount ? String(parseFloat(initialData.amount) * 0.9) : '')
  );
  const [amountMax, setAmountMax] = useState(
    existingPattern?.amount_max || 
    (initialData?.amount ? String(parseFloat(initialData.amount) * 1.1) : '')
  );

  // Target fields - pre-fill with existing pattern or initial data
  const [targetDescription, setTargetDescription] = useState(
    existingPattern?.target_description || 
    initialData?.description || 
    ''
  );
  const [targetCategoryId, setTargetCategoryId] = useState(
    existingPattern ? String(existingPattern.target_category_id) : 
    (initialData?.categoryId ? String(initialData.categoryId) : '')
  );

  // UI state - parse weekdays from existing pattern if available
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

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!descriptionPattern.trim()) {
      setError('O padrão de descrição é obrigatório');
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

    setSaving(true);

    try {
      const pattern: AdvancedPattern = {
        description_pattern: descriptionPattern,
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
      };

      await onSave(pattern);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar padrão');
    } finally {
      setSaving(false);
    }
  };

  // Generate example pattern string
  const generateExamplePattern = () => {
    const parts = [];
    parts.push(descriptionPattern || '.*');
    parts.push(datePattern || '.*');
    parts.push(selectedWeekdays.length > 0 ? `(${selectedWeekdays.join('|')})` : weekdayPattern || '.*');
    if (amountMin && amountMax) {
      parts.push(`<<${amountMin}-${amountMax}>>`);
    } else {
      parts.push('.*');
    }
    return parts.join('\\n');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {existingPattern 
                ? '✏️ Editar Padrão Avançado'
                : initialData 
                  ? '🔄 Converter para Padrão Avançado' 
                  : '🎯 Criador de Padrões Avançado'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {existingPattern
                ? 'Modifique as regras de correspondência do seu padrão'
                : initialData
                  ? 'Transforme seu padrão simples em um padrão avançado com regex e regras customizadas'
                  : 'Crie padrões inteligentes usando regex e regras de correspondência'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-8">
            {/* LEFT SIDE: Pattern Builder */}
            <div className="space-y-6">
              <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  <span>📋</span>
                  <span>Padrão de Correspondência</span>
                </h3>

                <div className="space-y-4">
                  {/* Description Pattern */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padrão de Descrição (Regex) *
                    </label>
                    <input
                      type="text"
                      value={descriptionPattern}
                      onChange={(e) => setDescriptionPattern(e.target.value)}
                      placeholder="Ex: AMZN.* ou ^NETFLIX.*"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use regex para corresponder à descrição da transação
                    </p>
                  </div>

                  {/* Date Pattern */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padrão de Data (Opcional)
                    </label>
                    <input
                      type="text"
                      value={datePattern}
                      onChange={(e) => setDatePattern(e.target.value)}
                      placeholder="Ex: 2024-11-.* ou .*-15 (dia 15)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Corresponde ao formato de data (YYYY-MM-DD)
                    </p>
                  </div>

                  {/* Weekday Pattern */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dias da Semana
                    </label>
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {WEEKDAY_NAMES.map((name, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleWeekday(idx)}
                          className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            selectedWeekdays.includes(idx)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {name.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">
                      Ou use regex:
                      <input
                        type="text"
                        value={weekdayPattern}
                        onChange={(e) => {
                          setWeekdayPattern(e.target.value);
                          setSelectedWeekdays([]);
                        }}
                        placeholder="Ex: (4|6) para Quinta ou Sábado"
                        className="ml-2 px-2 py-1 border border-gray-300 rounded font-mono text-xs w-48"
                      />
                    </div>
                  </div>

                  {/* Amount Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Faixa de Valor (Opcional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={amountMin}
                        onChange={(e) => setAmountMin(e.target.value)}
                        placeholder="Mín"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-gray-500">até</span>
                      <input
                        type="number"
                        step="0.01"
                        value={amountMax}
                        onChange={(e) => setAmountMax(e.target.value)}
                        placeholder="Máx"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Sintaxe interna: <code className="bg-gray-100 px-1 rounded">{`<<${amountMin || 'min'}-${amountMax || 'max'}>>`}</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Pattern Preview */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">📄 Padrão Completo</h4>
                <pre className="bg-white p-3 rounded border border-gray-300 text-xs font-mono overflow-x-auto">
{generateExamplePattern()}
                </pre>
              </div>
            </div>

            {/* RIGHT SIDE: Target Mapping */}
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Mapeia Para</span>
                </h3>

                <div className="space-y-4">
                  {/* Target Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição de Destino *
                    </label>
                    <input
                      type="text"
                      value={targetDescription}
                      onChange={(e) => setTargetDescription(e.target.value)}
                      placeholder="Ex: Leite em pó Amazon"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      O nome que aparecerá nas transações correspondentes
                    </p>
                  </div>

                  {/* Target Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria de Destino *
                    </label>
                    <select
                      value={targetCategoryId}
                      onChange={(e) => setTargetCategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione uma categoria</option>
                      {Array.from(categories.values()).map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      A categoria que será aplicada automaticamente
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              {targetDescription && targetCategoryId && (
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <span>👁️</span>
                    <span>Preview do Resultado</span>
                  </h4>
                  <div className="bg-white rounded-lg p-4 border border-green-300">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900 mb-2">{targetDescription}</div>
                        {categories.has(parseInt(targetCategoryId)) && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            <span>{categories.get(parseInt(targetCategoryId))!.icon}</span>
                            <span>{categories.get(parseInt(targetCategoryId))!.name}</span>
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full border border-green-300">
                        ✅ Matched
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <span>💡</span>
                  <span>Dicas</span>
                </h4>
                <ul className="text-xs text-yellow-800 space-y-1">
                  <li>• Use <code className="bg-yellow-100 px-1 rounded">.*</code> para corresponder a qualquer coisa</li>
                  <li>• Use <code className="bg-yellow-100 px-1 rounded">^</code> para início e <code className="bg-yellow-100 px-1 rounded">$</code> para fim</li>
                  <li>• Dias da semana: 0=Domingo, 1=Segunda, ..., 6=Sábado</li>
                  <li>• Use <code className="bg-yellow-100 px-1 rounded">(A|B)</code> para "A ou B"</li>
                  <li>• Faixa de valor cria filtro entre mínimo e máximo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !descriptionPattern || !targetDescription || !targetCategoryId}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </span>
            ) : (
              '💾 Salvar Padrão'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
