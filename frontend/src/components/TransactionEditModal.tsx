import { useState, useEffect } from 'react';
import type { Transaction } from '../types/transaction';
import type { Category } from '../types/category';
import type { PlannedEntryWithStatus } from '../types/budget';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import { CATEGORY_COLORS } from '../utils/colors';
import { parseTransactionDate } from '../utils/date';
import { getPlannedEntryForTransaction, unmatchPlannedEntry, updatePlannedEntry } from '../api/budget';
import { getTransactionTags, setTransactionTags } from '../api/tags';
import { useModalDismiss } from '../hooks/useModalDismiss';
import PatternCreator, { type AdvancedPattern } from './PatternCreator';
import TagSelector from './TagSelector';
import TransactionPlannedEntryLinkModal from './TransactionPlannedEntryLinkModal';

const AVAILABLE_ICONS = ['🍔', '🚗', '🏠', '💡', '🎮', '👕', '💊', '📚', '✈️', '🎁', '💰', '📱', '🏥', '🎬', '🛒', '☕', '🍕', '🎵', '🏋️', '🐕'];

interface TransactionEditModalProps {
  transaction: Transaction;
  categories: Map<number, Category>;
  onClose: () => void;
  onSave: () => void;
}

export default function TransactionEditModal({
  transaction,
  categories,
  onClose,
  onSave,
}: TransactionEditModalProps) {
  const { token } = useAuth();
  const [description, setDescription] = useState(transaction.description);
  const [categoryId, setCategoryId] = useState<number | null>(transaction.category_id);
  const [notes, setNotes] = useState(transaction.notes || '');
  const [isIgnored, setIsIgnored] = useState(transaction.is_ignored);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patternCreateSuccess, setPatternCreateSuccess] = useState<string | null>(null);
  
  // Pattern creator
  const [showAdvancedPatternCreator, setShowAdvancedPatternCreator] = useState(false);
  const [applyRetroactivelyOnCreate, setApplyRetroactivelyOnCreate] = useState(true);
  const [patternDraft, setPatternDraft] = useState<{
    description: string;
    category_id: number;
    description_pattern: string;
    target_description: string;
    target_category_id: number;
    apply_retroactively: boolean;
  } | null>(null);

  // Linked planned entry
  const [linkedPlannedEntry, setLinkedPlannedEntry] = useState<PlannedEntryWithStatus | null>(null);
  const [loadingPlannedEntry, setLoadingPlannedEntry] = useState(true);
  const [showPlannedEntryLinkModal, setShowPlannedEntryLinkModal] = useState(false);
  const [unlinkingEntry, setUnlinkingEntry] = useState(false);

  // Tags
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);

  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Handle ESC key and click outside to close modal
  const { handleBackdropClick, handleBackdropMouseDown } = useModalDismiss(onClose);

  // Fetch linked planned entry when modal opens
  useEffect(() => {
    const fetchLinkedPlannedEntry = async () => {
      if (!token) {
        setLoadingPlannedEntry(false);
        return;
      }

      try {
        const entry = await getPlannedEntryForTransaction(
          transaction.transaction_id,
          { token, organizationId: '1' }
        );
        setLinkedPlannedEntry(entry);
      } catch (err) {
        console.error('Failed to fetch linked planned entry:', err);
        // Don't set error - this is optional information
      } finally {
        setLoadingPlannedEntry(false);
      }
    };

    fetchLinkedPlannedEntry();
  }, [token, transaction.transaction_id]);

  // Fetch transaction tags when modal opens
  useEffect(() => {
    const fetchTransactionTags = async () => {
      if (!token) {
        setLoadingTags(false);
        return;
      }

      try {
        const tags = await getTransactionTags(
          transaction.transaction_id,
          { token, organizationId: '1' }
        );
        setSelectedTagIds((tags || []).map(tag => tag.tag_id));
      } catch (err) {
        console.error('Failed to fetch transaction tags:', err);
        // Don't set error - tags are optional
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTransactionTags();
  }, [token, transaction.transaction_id]);

  // Handle unlinking a planned entry
  const handleUnlinkPlannedEntry = async () => {
    if (!token || !linkedPlannedEntry) return;

    // Parse as local time to avoid timezone shift
    const txDate = parseTransactionDate(transaction.transaction_date);
    const month = txDate.getMonth() + 1;
    const year = txDate.getFullYear();

    setUnlinkingEntry(true);
    try {
      await unmatchPlannedEntry(
        linkedPlannedEntry.PlannedEntryID,
        month,
        year,
        { token, organizationId: '1' }
      );
      setLinkedPlannedEntry(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desvincular');
    } finally {
      setUnlinkingEntry(false);
    }
  };

  // Handle successful link from modal
  const handlePlannedEntryLinked = async () => {
    setShowPlannedEntryLinkModal(false);
    // Refetch the linked entry
    if (token) {
      try {
        const entry = await getPlannedEntryForTransaction(
          transaction.transaction_id,
          { token, organizationId: '1' }
        );
        setLinkedPlannedEntry(entry);

        // Apply the planned entry's description and category to the transaction
        if (entry) {
          setDescription(entry.Description);
          setCategoryId(entry.CategoryID);
        }
      } catch (err) {
        console.error('Failed to fetch linked planned entry:', err);
      }
    }
  };

  const handleSave = async () => {
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      // Save transaction details
      const response = await fetch(
        financialUrl(`accounts/${transaction.account_id}/transactions/${transaction.transaction_id}`),
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description,
            category_id: categoryId,
            notes: notes || null,
            is_ignored: isIgnored,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao atualizar transacao');
      }

      // Save tags
      await setTransactionTags(
        transaction.transaction_id,
        selectedTagIds,
        { token, organizationId: '1' }
      );

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!showAdvancedPatternCreator) {
      setPatternDraft(null);
    }
  }, [showAdvancedPatternCreator]);

  const handleSavePattern = async (pattern: AdvancedPattern) => {
    if (!token) return;

    try {
      // Extract planned_entry_id if present (for linking after creation)
      const { planned_entry_id, ...patternData } = pattern;

      // Create the pattern with apply_retroactively: true to automatically apply to existing transactions
      const response = await fetch(financialUrl('patterns'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...patternData, apply_retroactively: applyRetroactivelyOnCreate }),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar padrão');
      }

      const result = await response.json();
      const createdPattern = result.data;

      // If a planned entry was selected, link the pattern to it
      if (planned_entry_id && createdPattern?.pattern_id) {
        await updatePlannedEntry(
          planned_entry_id,
          { pattern_id: createdPattern.pattern_id },
          { token, organizationId: '1' }
        );
      }

      // Optional: show retroactive application count if backend returned it
      const updatedCount = result?.data?.updated_count;
      const totalChecked = result?.data?.total_checked;
      if (applyRetroactivelyOnCreate && typeof updatedCount === 'number') {
        setPatternCreateSuccess(
          typeof totalChecked === 'number'
            ? `✅ Padrão aplicado a ${updatedCount}/${totalChecked} transação(ões)`
            : `✅ Padrão aplicado a ${updatedCount} transação(ões)`
        );
      } else {
        setPatternCreateSuccess('✅ Padrão criado com sucesso');
      }
      setTimeout(() => setPatternCreateSuccess(null), 4000);

      // Close modal and notify parent to refresh data
      setShowAdvancedPatternCreator(false);
      setApplyRetroactivelyOnCreate(true);
      onSave(); // This will refresh the transaction list
      onClose(); // Close the edit modal
    } catch (err) {
      throw err; // Let PatternCreator handle the error
    }
  };

  const handleCreateCategory = async () => {
    if (!token || !newCategoryName) return;

    setCreatingCategory(true);
    setError(null);

    try {
      const response = await fetch(financialUrl('categories'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName,
          icon: newCategoryIcon || '📦',
          color: newCategoryColor,
          // Set category_type based on transaction type: credit → income, debit → expense
          category_type: transaction.transaction_type === 'credit' ? 'income' : 'expense',
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar categoria');
      }

      const result = await response.json();
      const newCategory = result.data;

      // Add new category to the map
      categories.set(newCategory.category_id, newCategory);
      
      // Select the new category
      setCategoryId(newCategory.category_id);
      
      // Reset form
      setShowNewCategoryForm(false);
      setNewCategoryName('');
      setNewCategoryIcon('');
      setNewCategoryColor('#6B7280');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria');
    } finally {
      setCreatingCategory(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return parseTransactionDate(dateString).toLocaleDateString('pt-BR');
  };

  // Check if any sub-modal is open (for stack behavior)
  const hasSubModalOpen = showAdvancedPatternCreator || showPlannedEntryLinkModal;

  return (
    <>
      {/* Main modal - hidden when sub-modal is open */}
      {!hasSubModalOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4"
          onMouseDown={handleBackdropMouseDown}
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-2xl shadow-warm-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-stone-900">Editar Transação</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-rust-50 border border-rust-200 text-rust-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {patternCreateSuccess && (
            <div className="bg-sage-50 border border-sage-200 text-sage-700 px-4 py-3 rounded-lg">
              {patternCreateSuccess}
            </div>
          )}

          {/* Transaction Info */}
          <div className="bg-stone-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600">Data</span>
              <span className="font-medium text-stone-900 tabular-nums">{formatDate(transaction.transaction_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600">Valor</span>
              <span className={`font-bold text-lg tabular-nums ${
                transaction.transaction_type === 'credit' ? 'text-sage-600' : 'text-rust-600'
              }`}>
                {transaction.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </span>
            </div>
            {transaction.original_description && (
              <div className="pt-2 border-t border-stone-200">
                <span className="text-xs text-stone-500">Descrição Original (OFX)</span>
                <p className="text-sm text-stone-700 mt-1">{transaction.original_description}</p>
              </div>
            )}
          </div>

          {/* Linked Planned Entry */}
          {!loadingPlannedEntry && linkedPlannedEntry && (
            <div className="bg-gradient-to-r from-wheat-50 to-wheat-100 rounded-xl p-4 border border-wheat-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📋</span>
                    <span className="text-sm font-medium text-wheat-700">Entrada Planejada Vinculada</span>
                  </div>
                  <h4 className="font-semibold text-stone-900">{linkedPlannedEntry.Description}</h4>
                  <div className="flex items-center gap-3 mt-2 text-sm text-stone-600">
                    <span className="flex items-center gap-1 tabular-nums">
                      💰 {formatCurrency(linkedPlannedEntry.Amount)}
                    </span>
                    {linkedPlannedEntry.MatchedAt && (
                      <span className="flex items-center gap-1 tabular-nums">
                        📅 Vinculado em {formatDate(linkedPlannedEntry.MatchedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    linkedPlannedEntry.Status === 'matched'
                      ? 'bg-sage-100 text-sage-700'
                      : linkedPlannedEntry.Status === 'pending'
                      ? 'bg-terra-100 text-terra-700'
                      : linkedPlannedEntry.Status === 'missed'
                      ? 'bg-rust-100 text-rust-700'
                      : 'bg-stone-100 text-stone-700'
                  }`}>
                    {linkedPlannedEntry.Status === 'matched' ? '✓ Vinculado'
                      : linkedPlannedEntry.Status === 'pending' ? '⏳ Pendente'
                      : linkedPlannedEntry.Status === 'missed' ? '⚠️ Atrasado'
                      : linkedPlannedEntry.Status}
                  </span>
                  <button
                    onClick={handleUnlinkPlannedEntry}
                    disabled={unlinkingEntry}
                    className="px-2 py-1 text-xs font-medium text-rust-600 hover:text-rust-700 hover:bg-rust-50 rounded transition-colors disabled:opacity-50"
                    title="Desvincular entrada planejada"
                  >
                    {unlinkingEntry ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Link to Planned Entry Button (when no link exists) */}
          {!loadingPlannedEntry && !linkedPlannedEntry && (
            <button
              onClick={() => setShowPlannedEntryLinkModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-wheat-300 text-wheat-700 rounded-xl hover:border-wheat-400 hover:bg-wheat-50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="font-medium">Vincular a Entrada Planejada</span>
            </button>
          )}
          {loadingPlannedEntry && (
            <div className="bg-stone-50 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-stone-200 rounded w-1/4 mb-2"></div>
              <div className="h-5 bg-stone-200 rounded w-1/2"></div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="Descrição da transação"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Categoria
            </label>
            <div className="space-y-2">
              <select
                value={categoryId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'new') {
                    setShowNewCategoryForm(true);
                  } else {
                    setCategoryId(value ? parseInt(value) : null);
                  }
                }}
                className="input"
              >
                <option value="">Selecione uma categoria</option>
                {Array.from(categories.values())
                  .filter((category) => {
                    // Filter categories based on transaction type
                    // Credit transactions (income) can only use income categories
                    // Debit transactions (expenses) can only use expense categories
                    const expectedType = transaction.transaction_type === 'credit' ? 'income' : 'expense';
                    return category.category_type === expectedType;
                  })
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                <option value="new" className="font-bold text-wheat-600">
                  ➕ Nova Categoria
                </option>
              </select>
              {/* Hint explaining the filtering */}
              <p className="text-xs text-stone-500 mt-1">
                {transaction.transaction_type === 'credit'
                  ? '💡 Mostrando apenas categorias de receita'
                  : '💡 Mostrando apenas categorias de despesa'}
              </p>

              {/* Preview of selected category */}
              {categoryId && categories.has(categoryId) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-2xl">{categories.get(categoryId)!.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-stone-900">{categories.get(categoryId)!.name}</div>
                    <div className="text-xs text-stone-500">Categoria selecionada</div>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-warm-sm"
                    style={{ backgroundColor: categories.get(categoryId)!.color || '#78716C' }}
                  />
                </div>
              )}

              {/* New Category Form */}
              {showNewCategoryForm && (
                <div className={`mt-4 p-5 rounded-xl border-2 space-y-4 ${
                  transaction.transaction_type === 'credit'
                    ? 'bg-gradient-to-br from-sage-50 to-sage-100 border-sage-200'
                    : 'bg-gradient-to-br from-rust-50 to-terra-50 border-rust-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-stone-900 flex items-center gap-2">
                        <span className="text-xl">{newCategoryIcon}</span>
                        Nova Categoria
                      </h4>
                      <p className={`text-xs mt-1 ${
                        transaction.transaction_type === 'credit' ? 'text-sage-600' : 'text-rust-600'
                      }`}>
                        {transaction.transaction_type === 'credit' ? '📈 Categoria de Receita' : '📉 Categoria de Despesa'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowNewCategoryForm(false);
                        setNewCategoryName('');
                        setNewCategoryIcon('📁');
                        setNewCategoryColor(CATEGORY_COLORS[0]);
                      }}
                      className="text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Escolha um ícone
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_ICONS.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewCategoryIcon(icon)}
                          className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all duration-200 ${
                            newCategoryIcon === icon
                              ? 'bg-wheat-500 text-white shadow-warm-lg scale-110'
                              : 'bg-white hover:bg-stone-100 border border-stone-200'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Nome da categoria
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">
                        {newCategoryIcon}
                      </span>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full pl-12 pr-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-transparent bg-white"
                        placeholder="Ex: Academia, Streaming..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCategoryName.trim()) {
                            handleCreateCategory();
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Escolha uma cor
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategoryColor(color)}
                          className={`w-10 h-10 rounded-lg transition-all duration-200 border-2 ${
                            newCategoryColor === color
                              ? 'border-stone-900 scale-110 shadow-warm-lg'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || creatingCategory}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-wheat-500 to-wheat-600 text-white rounded-lg hover:from-wheat-600 hover:to-wheat-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-warm-lg flex items-center justify-center gap-2"
                  >
                    {creatingCategory ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Criando...
                      </>
                    ) : (
                      <>
                        <span>{newCategoryIcon}</span>
                        Criar Categoria
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Adicione observacoes sobre esta transacao"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Tags
            </label>
            {loadingTags ? (
              <div className="animate-pulse flex flex-wrap gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 w-20 bg-stone-200 rounded-full"></div>
                ))}
              </div>
            ) : (
              <TagSelector
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                disabled={saving}
              />
            )}
          </div>

          {/* Ignore Toggle */}
          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
            <div>
              <div className="font-medium text-stone-900">Ignorar transação</div>
              <div className="text-sm text-stone-500">Não será contabilizada nos relatórios</div>
            </div>
            <button
              onClick={() => setIsIgnored(!isIgnored)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isIgnored ? 'bg-rust-600' : 'bg-stone-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isIgnored ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Create Pattern Section */}
          <div className="border-t border-stone-200 pt-6">
            <label className="flex items-center justify-center gap-2 text-xs text-stone-600 mb-3 select-none">
              <input
                type="checkbox"
                className="rounded border-stone-300 text-wheat-600 focus:ring-wheat-500"
                checked={applyRetroactivelyOnCreate}
                onChange={(e) => setApplyRetroactivelyOnCreate(e.target.checked)}
              />
              Aplicar em transações existentes
            </label>

            <button
              onClick={async () => {
                if (!token) return;
                if (!transaction.category_id) {
                  setError('Salve a transação com uma categoria antes de criar um padrão');
                  return;
                }
                try {
                  const res = await fetch(financialUrl(`transactions/${transaction.transaction_id}/pattern-draft`), {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'X-Active-Organization': '1',
                    },
                  });
                  if (!res.ok) {
                    throw new Error('Falha ao gerar sugestao de padrao');
                  }
                  const json = await res.json();
                  setPatternDraft(json.data);
                  setShowAdvancedPatternCreator(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Falha ao gerar sugestao de padrao');
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-stone-300 text-stone-600 rounded-lg hover:border-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-all text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Criar Padrão
            </button>
            <p className="text-xs text-stone-400 mt-2 text-center">
              Gere um padrao a partir desta transacao e ajuste antes de salvar
            </p>
          </div>
        </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-stone-50 border-t border-stone-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !description}
                className="btn-primary"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modals - rendered outside parent for stack behavior */}
      {showAdvancedPatternCreator && (
        <PatternCreator
          categories={categories}
          onClose={() => setShowAdvancedPatternCreator(false)}
          onSave={handleSavePattern}
          initialData={{
            description: patternDraft?.description || transaction.original_description || description,
            categoryId: patternDraft?.category_id ?? categoryId ?? undefined,
            amount: transaction.amount,
            expectedDay: parseTransactionDate(transaction.transaction_date).getDate(),
          }}
        />
      )}

      {showPlannedEntryLinkModal && (
        <TransactionPlannedEntryLinkModal
          transaction={transaction}
          categories={categories}
          onClose={() => setShowPlannedEntryLinkModal(false)}
          onLink={handlePlannedEntryLinked}
        />
      )}
    </>
  );
}

