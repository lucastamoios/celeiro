import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import type { Category } from '../types/category';
import type { ApiResponse } from '../types/transaction';
import type { PlannedEntry } from '../types/budget';
import { getSavedPatterns, deletePlannedEntry } from '../api/budget';
import AdvancedPatternCreator, { type AdvancedPattern as AdvancedPatternInput, type InitialPatternData } from './AdvancedPatternCreator';

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
}

export default function PatternManager() {
  const { token } = useAuth();
  const [advancedPatterns, setAdvancedPatterns] = useState<AdvancedPattern[]>([]);
  const [simplePatterns, setSimplePatterns] = useState<PlannedEntry[]>([]);
  const [categories, setCategories] = useState<Map<number, Category>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [deletingPattern, setDeletingPattern] = useState<number | null>(null);
  const [togglingPattern, setTogglingPattern] = useState<number | null>(null);
  const [deletingSimplePattern, setDeletingSimplePattern] = useState<number | null>(null);
  const [convertingPatternId, setConvertingPatternId] = useState<number | null>(null);
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
      const [categoriesRes, advancedPatternsRes] = await Promise.all([
        fetch(financialUrl('categories'), { headers }),
        fetch(financialUrl('advanced-patterns'), { headers })
      ]);

      if (!categoriesRes.ok || !advancedPatternsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const categoriesData: ApiResponse<Category[]> = await categoriesRes.json();
      const advancedPatternsData: ApiResponse<AdvancedPattern[]> = await advancedPatternsRes.json();

      // Fetch simple patterns (saved from transactions)
      const simplePatternsData = await getSavedPatterns(undefined, { token });

      const categoryMap = new Map<number, Category>();
      (categoriesData.data || []).forEach(cat => categoryMap.set(cat.CategoryID, cat));

      setCategories(categoryMap);
      setAdvancedPatterns(advancedPatternsData.data || []);
      setSimplePatterns(simplePatternsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePattern = async (pattern: AdvancedPatternInput) => {
    if (!token) return;

    try {
      const response = await fetch(
        financialUrl('advanced-patterns'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pattern),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save pattern');
      }

      setSuccess('✅ Padrão criado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      setShowCreator(false);
      fetchData();
    } catch (err) {
      throw err;
    }
  };

  const handleDeletePattern = async (patternId: number) => {
    if (!token || !confirm('Tem certeza que deseja deletar este padrão?')) return;

    setDeletingPattern(patternId);
    setError(null);

    try {
      const response = await fetch(
        `${financialUrl('advanced-patterns')}/${patternId}`,
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
        `${financialUrl('advanced-patterns')}/${pattern.pattern_id}`,
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

  const handleDeleteSimplePattern = async (patternId: number) => {
    if (!token || !confirm('Tem certeza que deseja deletar este padrão?')) return;

    // Validate patternId before making the request
    if (!patternId || isNaN(patternId)) {
      setError('ID do padrão inválido');
      return;
    }

    setDeletingSimplePattern(patternId);
    setError(null);

    console.log('Deleting pattern with ID:', patternId); // Debug log

    try {
      await deletePlannedEntry(patternId, { token });

      setSuccess('✅ Padrão deletado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      console.error('Error deleting pattern:', err); // Debug log
      setError(err instanceof Error ? err.message : 'Failed to delete pattern');
    } finally {
      setDeletingSimplePattern(null);
    }
  };

  const handleConvertToAdvanced = (pattern: PlannedEntry) => {
    setConvertingPatternId(pattern.PlannedEntryID);
    setInitialPatternData({
      description: pattern.Description,
      categoryId: pattern.CategoryID,
      amount: pattern.Amount,
      expectedDay: pattern.ExpectedDay,
    });
    setShowCreator(true);
  };

  const handleCloseCreator = () => {
    setShowCreator(false);
    setConvertingPatternId(null);
    setInitialPatternData(undefined);
  };

  const handleSavePatternWithConversion = async (pattern: AdvancedPatternInput) => {
    // First save the advanced pattern
    await handleSavePattern(pattern);

    // If we were converting a simple pattern, delete it after successful conversion
    if (convertingPatternId) {
      try {
        await deletePlannedEntry(convertingPatternId, { token: token! });
        setSuccess('✅ Padrão convertido para avançado com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        // Advanced pattern was created, but simple pattern deletion failed
        // This is okay - just log it
        console.warn('Failed to delete simple pattern after conversion:', err);
      }
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

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(amount));
  };

  const totalPatterns = advancedPatterns.length + simplePatterns.length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Padrões</h1>
            <p className="text-gray-600 mt-2">
              {totalPatterns} padrão{totalPatterns !== 1 ? 'ões' : ''} cadastrado{totalPatterns !== 1 ? 's' : ''}
              ({simplePatterns.length} simples, {advancedPatterns.length} avançado{advancedPatterns.length !== 1 ? 's' : ''})
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => setShowCreator(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              ➕ Criar Padrão Avançado
            </button>

            {success && (
              <p className="text-sm text-green-600 font-medium">{success}</p>
            )}

            {error && (
              <p className="text-sm text-red-600 font-medium">❌ {error}</p>
            )}
          </div>
        </div>

        {/* Simple Patterns Section */}
        {simplePatterns.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>💾</span>
              <span>Padrões Salvos de Transações</span>
              <span className="text-sm font-normal text-gray-500">({simplePatterns.length})</span>
            </h2>
            <div className="grid gap-3">
              {simplePatterns.map(pattern => (
                <div
                  key={pattern.PlannedEntryID}
                  className={`bg-white rounded-lg shadow p-4 border-2 transition-all ${
                    pattern.IsActive
                      ? 'border-green-200 hover:border-green-300'
                      : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900">
                          {pattern.Description}
                        </h3>
                        {!pattern.IsActive && (
                          <span className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
                            Inativo
                          </span>
                        )}
                      </div>

                      {/* Category and Amount */}
                      <div className="flex items-center gap-3">
                        {categories.has(pattern.CategoryID) && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            <span>{categories.get(pattern.CategoryID)!.Icon}</span>
                            <span>{categories.get(pattern.CategoryID)!.Name}</span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency(pattern.Amount)}
                        </span>
                        {pattern.ExpectedDay && (
                          <span className="text-xs text-gray-500">
                            📅 Dia {pattern.ExpectedDay}
                          </span>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className="text-xs text-gray-400">
                        Criado em: {new Date(pattern.CreatedAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleConvertToAdvanced(pattern)}
                        className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                        title="Converter para padrão avançado com regex"
                      >
                        🔄 Converter
                      </button>
                      <button
                        onClick={() => handleDeleteSimplePattern(pattern.PlannedEntryID)}
                        disabled={deletingSimplePattern === pattern.PlannedEntryID}
                        className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {deletingSimplePattern === pattern.PlannedEntryID ? (
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
          </div>
        )}

        {/* Advanced Patterns Section */}
        {advancedPatterns.length === 0 && simplePatterns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum padrão criado ainda
            </h3>
            <p className="text-gray-600 mb-6">
              Salve transações como padrões simples ou crie padrões avançados com regex para categorizar transações automaticamente
            </p>
            <button
              onClick={() => setShowCreator(true)}
              className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              ➕ Criar Primeiro Padrão Avançado
            </button>
          </div>
        ) : advancedPatterns.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎯</span>
              <span>Padrões Avançados (Regex)</span>
              <span className="text-sm font-normal text-gray-500">({advancedPatterns.length})</span>
            </h2>
            <div className="grid gap-4">
              {advancedPatterns.map(pattern => (
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
                        <span>{categories.get(pattern.target_category_id)!.Icon}</span>
                        <span>{categories.get(pattern.target_category_id)!.Name}</span>
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
        </div>
        ) : null}

        {/* Advanced Pattern Creator Modal */}
        {showCreator && (
          <AdvancedPatternCreator
            categories={categories}
            onClose={handleCloseCreator}
            onSave={handleSavePatternWithConversion}
            initialData={initialPatternData}
          />
        )}
      </div>
    </div>
  );
}
