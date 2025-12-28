import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import type { Category } from '../types/category';
import type { ApiResponse } from '../types/transaction';
import AdvancedPatternCreator, { type AdvancedPattern as AdvancedPatternInput, type InitialPatternData } from './AdvancedPatternCreator';

interface LinkedPlannedEntry {
  planned_entry_id: number;
  name: string;
}

interface AdvancedPattern {
  pattern_id: number;
  user_id: number;
  organization_id: number;
  description_pattern: string;
  date_pattern?: string;
  weekday_pattern?: string;
  amount_min?: string;
  amount_max?: string;
  target_description: string;
  target_category_id: number;
  apply_retroactively: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  linked_planned_entries?: LinkedPlannedEntry[];
}

export default function PatternManager() {
  const { token } = useAuth();
  const [patterns, setPatterns] = useState<AdvancedPattern[]>([]);
  const [categories, setCategories] = useState<Map<number, Category>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [editingPattern, setEditingPattern] = useState<AdvancedPattern | null>(null);
  const [deletingPattern, setDeletingPattern] = useState<number | null>(null);
  const [togglingPattern, setTogglingPattern] = useState<number | null>(null);
  const [applyingPattern, setApplyingPattern] = useState<number | null>(null);
  const [initialPatternData, setInitialPatternData] = useState<InitialPatternData | undefined>(undefined);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Active-Organization': '1'
    };

    try {
      const [categoriesRes, patternsRes] = await Promise.all([
        fetch(financialUrl('categories'), { headers }),
        fetch(financialUrl('patterns'), { headers })
      ]);

      if (!categoriesRes.ok || !patternsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const categoriesData: ApiResponse<Category[]> = await categoriesRes.json();
      const patternsData: ApiResponse<AdvancedPattern[]> = await patternsRes.json();

      const categoryMap = new Map<number, Category>();
      (categoriesData.data || []).forEach(cat => categoryMap.set(cat.category_id, cat));

      setCategories(categoryMap);
      setPatterns(patternsData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePattern = async (pattern: AdvancedPatternInput) => {
    if (!token) return;

    const isEditing = editingPattern !== null;
    const url = isEditing 
      ? `${financialUrl('patterns')}/${editingPattern.pattern_id}`
      : financialUrl('patterns');
    const method = isEditing ? 'PUT' : 'POST';

    console.log('Saving pattern:', { isEditing, url, method, pattern });

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pattern),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(errorData?.message || `Failed to ${isEditing ? 'update' : 'save'} pattern`);
      }

      const result = await response.json();
      console.log('Success result:', result);

      setSuccess(isEditing ? '✅ Padrão atualizado com sucesso!' : '✅ Padrão criado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      setShowCreator(false);
      setEditingPattern(null);
      fetchData();
    } catch (err) {
      console.error('Save pattern error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar padrão');
    }
  };

  const handleDeletePattern = async (patternId: number) => {
    if (!token || !confirm('Tem certeza que deseja deletar este padrão?')) return;

    setDeletingPattern(patternId);
    setError(null);

    try {
      const response = await fetch(
        `${financialUrl('patterns')}/${patternId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete pattern');
      }

      setSuccess('✅ Padrão deletado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pattern');
    } finally {
      setDeletingPattern(null);
    }
  };

  const handleToggleActive = async (pattern: AdvancedPattern) => {
    if (!token) return;

    setTogglingPattern(pattern.pattern_id);
    setError(null);

    try {
      const response = await fetch(
        `${financialUrl('patterns')}/${pattern.pattern_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_active: !pattern.is_active,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to toggle pattern');
      }

      setSuccess(`✅ Padrão ${!pattern.is_active ? 'ativado' : 'desativado'} com sucesso!`);
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle pattern');
    } finally {
      setTogglingPattern(null);
    }
  };

  const handleCloseCreator = () => {
    setShowCreator(false);
    setEditingPattern(null);
    setInitialPatternData(undefined);
  };

  const handleEditPattern = (pattern: AdvancedPattern) => {
    setEditingPattern(pattern);
    setShowCreator(true);
  };

  const handleApplyRetroactively = async (patternId: number) => {
    if (!token) return;

    setApplyingPattern(patternId);
    setError(null);

    try {
      const response = await fetch(
        `${financialUrl('patterns')}/${patternId}/apply-retroactively`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to apply pattern retroactively');
      }

      const result = await response.json();
      setSuccess(`✅ Padrão aplicado a ${result.data.updated_count} transação(ões)!`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply pattern');
    } finally {
      setApplyingPattern(null);
    }
  };

  const formatWeekday = (pattern?: string) => {
    if (!pattern) return null;
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    // Parse pattern like "(1|2|3)" to extract numbers
    const matches = pattern.match(/\d/g);
    if (!matches) return pattern;
    return matches.map(d => days[parseInt(d)]).join(', ');
  };

  const formatAmount = (amount?: string) => {
    if (!amount) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(amount));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
        <div className="max-w-7xl mx-auto">
          <div className="h-9 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalPatterns = patterns.length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Padrões</h1>
            <p className="text-gray-600 mt-2">
              {totalPatterns} padrão{totalPatterns !== 1 ? 'ões' : ''} cadastrado{totalPatterns !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => setShowCreator(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              ➕ Criar Padrão
            </button>

            {success && (
              <p className="text-sm text-green-600 font-medium">{success}</p>
            )}

            {error && (
              <p className="text-sm text-red-600 font-medium">❌ {error}</p>
            )}
          </div>
        </div>

        {/* Patterns Section */}
        {patterns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum padrão criado ainda
            </h3>
            <p className="text-gray-600 mb-6">
              Crie padrões com regex para categorizar transações automaticamente
            </p>
            <button
              onClick={() => setShowCreator(true)}
              className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              ➕ Criar Primeiro Padrão
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {patterns.map(pattern => (
              <div
                key={pattern.pattern_id}
                className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
                  pattern.is_active
                    ? 'border-blue-200 hover:border-blue-300'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {pattern.target_description}
                      </h3>
                      {!pattern.is_active && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
                          Inativo
                        </span>
                      )}
                      {pattern.apply_retroactively && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-purple-600 bg-purple-100 rounded-full">
                          🔄 Retroativo
                        </span>
                      )}
                    </div>

                    {/* Category */}
                    {categories.has(pattern.target_category_id) && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        <span>{categories.get(pattern.target_category_id)!.icon}</span>
                        <span>{categories.get(pattern.target_category_id)!.name}</span>
                      </div>
                    )}

                    {/* Linked Planned Entries */}
                    {pattern.linked_planned_entries && pattern.linked_planned_entries.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">📋 Entradas Planejadas:</span>
                        {pattern.linked_planned_entries.map(entry => (
                          <span
                            key={entry.planned_entry_id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full"
                          >
                            {entry.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pattern Details */}
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 font-medium min-w-[120px]">📝 Descrição:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">
                          {pattern.description_pattern}
                        </code>
                      </div>

                      {pattern.date_pattern && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 font-medium min-w-[120px]">📅 Data:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">
                            {pattern.date_pattern}
                          </code>
                        </div>
                      )}

                      {pattern.weekday_pattern && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 font-medium min-w-[120px]">🗓️ Dia da semana:</span>
                          <span className="text-gray-700">
                            {formatWeekday(pattern.weekday_pattern)}
                          </span>
                        </div>
                      )}

                      {pattern.amount_min && pattern.amount_max && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 font-medium min-w-[120px]">💰 Valor:</span>
                          <span className="text-gray-700">
                            {formatAmount(pattern.amount_min)} - {formatAmount(pattern.amount_max)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-gray-400 pt-2">
                      Criado em: {new Date(pattern.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleApplyRetroactively(pattern.pattern_id)}
                      disabled={applyingPattern === pattern.pattern_id}
                      className="px-4 py-2 text-sm font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                      title="Aplicar a transações existentes"
                    >
                      {applyingPattern === pattern.pattern_id ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Aplicando...
                        </span>
                      ) : (
                        '🔄 Aplicar a existentes'
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleActive(pattern)}
                      disabled={togglingPattern === pattern.pattern_id}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pattern.is_active
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      } disabled:opacity-50`}
                    >
                      {togglingPattern === pattern.pattern_id ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          ...
                        </span>
                      ) : pattern.is_active ? (
                        '⏸️ Desativar'
                      ) : (
                        '▶️ Ativar'
                      )}
                    </button>

                    <button
                      onClick={() => handleEditPattern(pattern)}
                      className="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      ✏️ Editar
                    </button>

                    <button
                      onClick={() => handleDeletePattern(pattern.pattern_id)}
                      disabled={deletingPattern === pattern.pattern_id}
                      className="px-4 py-2 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      {deletingPattern === pattern.pattern_id ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deletando...
                        </span>
                      ) : (
                        '🗑️ Deletar'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Advanced Pattern Creator Modal */}
        {showCreator && (
          <AdvancedPatternCreator
            categories={categories}
            onClose={handleCloseCreator}
            onSave={handleSavePattern}
            initialData={initialPatternData}
            existingPattern={editingPattern ? {
              description_pattern: editingPattern.description_pattern,
              date_pattern: editingPattern.date_pattern,
              weekday_pattern: editingPattern.weekday_pattern,
              amount_min: editingPattern.amount_min,
              amount_max: editingPattern.amount_max,
              target_description: editingPattern.target_description,
              target_category_id: editingPattern.target_category_id,
            } : undefined}
          />
        )}
      </div>
    </div>
  );
}
