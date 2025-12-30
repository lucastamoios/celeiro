import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import type { Category } from '../types/category';
import type { ApiResponse } from '../types/transaction';
import AdvancedPatternCreator, { type AdvancedPattern as AdvancedPatternInput, type InitialPatternData } from './AdvancedPatternCreator';
import PlannedEntryLinkModal from './PlannedEntryLinkModal';
import { updatePlannedEntry, createPlannedEntry } from '../api/budget';

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

  // Linking pattern to planned entry
  const [linkingPattern, setLinkingPattern] = useState<AdvancedPattern | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateEntryModal, setShowCreateEntryModal] = useState(false);
  const [creatingEntry, setCreatingEntry] = useState(false);

  // Create entry form state
  const [newEntryDescription, setNewEntryDescription] = useState('');
  const [newEntryAmountMin, setNewEntryAmountMin] = useState('');
  const [newEntryAmountMax, setNewEntryAmountMax] = useState('');
  const [newEntryType, setNewEntryType] = useState<'expense' | 'income'>('expense');
  const [newEntryIsRecurrent, setNewEntryIsRecurrent] = useState(true);

  // Pattern card menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('[aria-label="Ações"]') && !target.closest('.absolute')) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

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
      // When creating a new pattern (not editing), automatically apply to existing transactions
      const requestBody = isEditing
        ? pattern
        : { ...pattern, apply_retroactively: true };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(errorData?.message || `Failed to ${isEditing ? 'update' : 'save'} pattern`);
      }

      const result = await response.json();
      console.log('Success result:', result);

      setSuccess(isEditing ? '✅ Padrão atualizado com sucesso!' : '✅ Padrão criado e aplicado às transações existentes!');
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

  // Open link modal for a pattern
  const handleOpenLinkModal = (pattern: AdvancedPattern) => {
    setLinkingPattern(pattern);
    setShowLinkModal(true);
  };

  // Link pattern to existing planned entry
  const handleLinkToEntry = async (entryId: number) => {
    if (!token || !linkingPattern) return;

    try {
      await updatePlannedEntry(entryId, { pattern_id: linkingPattern.pattern_id }, {
        token,
        organizationId: '1',
      });

      setSuccess(`✅ Padrão vinculado à entrada planejada!`);
      setTimeout(() => setSuccess(null), 3000);
      setShowLinkModal(false);
      setLinkingPattern(null);
      fetchData(); // Refresh to show linked entries
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular padrão');
    }
  };

  // Open create entry modal for a pattern
  const handleOpenCreateEntryModal = (pattern: AdvancedPattern) => {
    setLinkingPattern(pattern);
    setNewEntryDescription(pattern.target_description);
    setNewEntryAmountMin(pattern.amount_min || '');
    setNewEntryAmountMax(pattern.amount_max || '');
    setNewEntryType('expense');
    setNewEntryIsRecurrent(true);
    setShowCreateEntryModal(true);
  };

  // Create new planned entry from pattern
  const handleCreateEntryFromPattern = async () => {
    if (!token || !linkingPattern) return;

    setCreatingEntry(true);
    setError(null);

    try {
      const amountMin = parseFloat(newEntryAmountMin) || 0;
      const amountMax = parseFloat(newEntryAmountMax) || amountMin;

      await createPlannedEntry({
        category_id: linkingPattern.target_category_id,
        description: newEntryDescription,
        amount: amountMax, // Main amount is max
        amount_min: amountMin,
        amount_max: amountMax,
        entry_type: newEntryType,
        is_recurrent: newEntryIsRecurrent,
        is_saved_pattern: true,
        pattern_id: linkingPattern.pattern_id,
        description_pattern: linkingPattern.description_pattern,
      }, {
        token,
        organizationId: '1',
      });

      setSuccess(`✅ Entrada planejada criada e vinculada ao padrão!`);
      setTimeout(() => setSuccess(null), 3000);
      setShowCreateEntryModal(false);
      setLinkingPattern(null);
      fetchData(); // Refresh to show linked entries
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar entrada planejada');
    } finally {
      setCreatingEntry(false);
    }
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
            {patterns.map(pattern => {
              const category = categories.get(pattern.target_category_id);
              const hasLinkedEntries = pattern.linked_planned_entries && pattern.linked_planned_entries.length > 0;

              return (
                <div
                  key={pattern.pattern_id}
                  className={`bg-white rounded-lg shadow-sm border transition-all ${
                    pattern.is_active
                      ? 'border-gray-200 hover:shadow-md'
                      : 'border-gray-200 opacity-60'
                  }`}
                >
                  {/* Compact Card Layout */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Main Info */}
                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {pattern.target_description}
                          </h3>
                          {category && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                              {category.icon} {category.name}
                            </span>
                          )}
                          {hasLinkedEntries && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Vinculado
                            </span>
                          )}
                          {!pattern.is_active && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              Inativo
                            </span>
                          )}
                        </div>

                        {/* Pattern regex */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-500">Padrão:</span>
                          <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700 truncate max-w-md">
                            {pattern.description_pattern}
                          </code>
                        </div>

                        {/* Additional filters (compact) */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {pattern.weekday_pattern && (
                            <span>🗓️ {formatWeekday(pattern.weekday_pattern)}</span>
                          )}
                          {pattern.amount_min && pattern.amount_max && (
                            <span>💰 {formatAmount(pattern.amount_min)} - {formatAmount(pattern.amount_max)}</span>
                          )}
                          {pattern.date_pattern && (
                            <span>📅 {pattern.date_pattern}</span>
                          )}
                        </div>

                        {/* Linked entries (if any) */}
                        {hasLinkedEntries && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs text-gray-500">📋</span>
                            {pattern.linked_planned_entries!.map(entry => (
                              <span
                                key={entry.planned_entry_id}
                                className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded"
                              >
                                {entry.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Three-dots Menu */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === pattern.pattern_id ? null : pattern.pattern_id)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          aria-label="Ações"
                        >
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === pattern.pattern_id && (
                          <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            {/* Apply Retroactively */}
                            <button
                              onClick={() => {
                                handleApplyRetroactively(pattern.pattern_id);
                                setOpenMenuId(null);
                              }}
                              disabled={applyingPattern === pattern.pattern_id}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                            >
                              {applyingPattern === pattern.pattern_id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Aplicando...
                                </>
                              ) : (
                                <>🔄 Aplicar a existentes</>
                              )}
                            </button>

                            {/* Toggle Active */}
                            <button
                              onClick={() => {
                                handleToggleActive(pattern);
                                setOpenMenuId(null);
                              }}
                              disabled={togglingPattern === pattern.pattern_id}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {pattern.is_active ? '⏸️ Desativar' : '▶️ Ativar'}
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => {
                                handleEditPattern(pattern);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              ✏️ Editar
                            </button>

                            <div className="border-t border-gray-100 my-1"></div>

                            {/* Link to Entry */}
                            <button
                              onClick={() => {
                                handleOpenLinkModal(pattern);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              🔗 Vincular a Entrada
                            </button>

                            {/* Create Entry */}
                            <button
                              onClick={() => {
                                handleOpenCreateEntryModal(pattern);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              📋 Criar Entrada Planejada
                            </button>

                            <div className="border-t border-gray-100 my-1"></div>

                            {/* Delete */}
                            <button
                              onClick={() => {
                                handleDeletePattern(pattern.pattern_id);
                                setOpenMenuId(null);
                              }}
                              disabled={deletingPattern === pattern.pattern_id}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingPattern === pattern.pattern_id ? (
                                <span className="flex items-center gap-2">
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

        {/* Link to Planned Entry Modal */}
        {showLinkModal && linkingPattern && (
          <PlannedEntryLinkModal
            pattern={linkingPattern}
            categories={categories}
            onClose={() => {
              setShowLinkModal(false);
              setLinkingPattern(null);
            }}
            onLink={handleLinkToEntry}
          />
        )}

        {/* Create Planned Entry from Pattern Modal */}
        {showCreateEntryModal && linkingPattern && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateEntryModal(false);
                setLinkingPattern(null);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-[500px] max-w-[95vw] max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">📋 Criar Entrada Planejada</h2>
                  <button
                    onClick={() => {
                      setShowCreateEntryModal(false);
                      setLinkingPattern(null);
                    }}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 text-sm text-white/90">
                  Baseado no padrão: <code className="bg-white/20 px-1.5 py-0.5 rounded">{linkingPattern.description_pattern}</code>
                </div>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Category (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                    {categories.get(linkingPattern.target_category_id)?.icon}{' '}
                    {categories.get(linkingPattern.target_category_id)?.name}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    value={newEntryDescription}
                    onChange={(e) => setNewEntryDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Nome da entrada"
                  />
                </div>

                {/* Amount Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Mínimo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newEntryAmountMin}
                      onChange={(e) => setNewEntryAmountMin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Máximo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newEntryAmountMax}
                      onChange={(e) => setNewEntryAmountMax(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Entry Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="entryType"
                        checked={newEntryType === 'expense'}
                        onChange={() => setNewEntryType('expense')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Despesa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="entryType"
                        checked={newEntryType === 'income'}
                        onChange={() => setNewEntryType('income')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Receita</span>
                    </label>
                  </div>
                </div>

                {/* Recurrent */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEntryIsRecurrent}
                      onChange={(e) => setNewEntryIsRecurrent(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Recorrente (mensal)</span>
                  </label>
                </div>

                {/* Info */}
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-700">
                  <strong>💡 Dica:</strong> A entrada será automaticamente vinculada ao padrão.
                  Quando uma transação corresponder ao padrão, ela poderá ser automaticamente
                  associada a esta entrada planejada.
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateEntryModal(false);
                    setLinkingPattern(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateEntryFromPattern}
                  disabled={creatingEntry || !newEntryDescription.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingEntry ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Criando...
                    </>
                  ) : (
                    'Criar Entrada'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
