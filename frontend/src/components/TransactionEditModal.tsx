import { useState, useEffect } from 'react';
import type { Transaction } from '../types/transaction';
import type { Category } from '../types/category';
import type { PlannedEntryWithStatus } from '../types/budget';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import { CATEGORY_COLORS } from '../utils/colors';
import { getPlannedEntryForTransaction } from '../api/budget';
import { getTransactionTags, setTransactionTags } from '../api/tags';
import { useModalDismiss } from '../hooks/useModalDismiss';
import AdvancedPatternCreator, { type AdvancedPattern } from './AdvancedPatternCreator';
import TagSelector from './TagSelector';

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
  
  // Advanced pattern creator
  const [showAdvancedPatternCreator, setShowAdvancedPatternCreator] = useState(false);

  // Linked planned entry
  const [linkedPlannedEntry, setLinkedPlannedEntry] = useState<PlannedEntryWithStatus | null>(null);
  const [loadingPlannedEntry, setLoadingPlannedEntry] = useState(true);

  // Tags
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);

  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Handle ESC key and click outside to close modal
  const { handleBackdropClick } = useModalDismiss(onClose);

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
        setSelectedTagIds(tags.map(tag => tag.tag_id));
      } catch (err) {
        console.error('Failed to fetch transaction tags:', err);
        // Don't set error - tags are optional
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTransactionTags();
  }, [token, transaction.transaction_id]);

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

  const handleSavePattern = async (pattern: AdvancedPattern) => {
    if (!token) return;

    try {
      // Create the pattern with apply_retroactively: true to automatically apply to existing transactions
      const response = await fetch(financialUrl('patterns'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...pattern, apply_retroactively: true }),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar padrão');
      }

      // Close modal and notify parent to refresh data
      setShowAdvancedPatternCreator(false);
      onSave(); // This will refresh the transaction list
      onClose(); // Close the edit modal
    } catch (err) {
      throw err; // Let AdvancedPatternCreator handle the error
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
    return new Date(dateString).toLocaleDateString('pt-BR');
  };


  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">Editar Transação</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Transaction Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Data</span>
              <span className="font-medium text-gray-900">{formatDate(transaction.transaction_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Valor</span>
              <span className={`font-bold text-lg ${
                transaction.transaction_type === 'credit' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {transaction.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </span>
            </div>
            {transaction.original_description && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-500">Descrição Original (OFX)</span>
                <p className="text-sm text-gray-700 mt-1">{transaction.original_description}</p>
              </div>
            )}
          </div>

          {/* Linked Planned Entry */}
          {!loadingPlannedEntry && linkedPlannedEntry && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📋</span>
                    <span className="text-sm font-medium text-purple-700">Entrada Planejada Vinculada</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">{linkedPlannedEntry.Description}</h4>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      💰 {formatCurrency(linkedPlannedEntry.Amount)}
                    </span>
                    {linkedPlannedEntry.MatchedAt && (
                      <span className="flex items-center gap-1">
                        📅 Vinculado em {formatDate(linkedPlannedEntry.MatchedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  linkedPlannedEntry.Status === 'matched'
                    ? 'bg-green-100 text-green-700'
                    : linkedPlannedEntry.Status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : linkedPlannedEntry.Status === 'missed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {linkedPlannedEntry.Status === 'matched' ? '✓ Vinculado'
                    : linkedPlannedEntry.Status === 'pending' ? '⏳ Pendente'
                    : linkedPlannedEntry.Status === 'missed' ? '⚠️ Atrasado'
                    : linkedPlannedEntry.Status}
                </span>
              </div>
            </div>
          )}
          {loadingPlannedEntry && (
            <div className="bg-gray-50 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descrição da transação"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <option value="new" className="font-bold text-blue-600">
                  ➕ Nova Categoria
                </option>
              </select>
              {/* Hint explaining the filtering */}
              <p className="text-xs text-gray-500 mt-1">
                {transaction.transaction_type === 'credit'
                  ? '💡 Mostrando apenas categorias de receita'
                  : '💡 Mostrando apenas categorias de despesa'}
              </p>

              {/* Preview of selected category */}
              {categoryId && categories.has(categoryId) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-2xl">{categories.get(categoryId)!.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{categories.get(categoryId)!.name}</div>
                    <div className="text-xs text-gray-500">Categoria selecionada</div>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: categories.get(categoryId)!.color || '#6B7280' }}
                  />
                </div>
              )}

              {/* New Category Form */}
              {showNewCategoryForm && (
                <div className={`mt-4 p-5 rounded-xl border-2 space-y-4 ${
                  transaction.transaction_type === 'credit'
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                    : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">{newCategoryIcon}</span>
                        Nova Categoria
                      </h4>
                      <p className={`text-xs mt-1 ${
                        transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
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
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              ? 'bg-emerald-500 text-white shadow-lg scale-110'
                              : 'bg-white hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full pl-12 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              ? 'border-gray-900 scale-110 shadow-lg'
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
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Adicione observacoes sobre esta transacao"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            {loadingTags ? (
              <div className="animate-pulse flex flex-wrap gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 w-20 bg-gray-200 rounded-full"></div>
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
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Ignorar transação</div>
              <div className="text-sm text-gray-500">Não será contabilizada nos relatórios</div>
            </div>
            <button
              onClick={() => setIsIgnored(!isIgnored)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isIgnored ? 'bg-red-600' : 'bg-gray-300'
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
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={() => setShowAdvancedPatternCreator(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-medium shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              🎯 Criar Padrão Avançado
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Crie regras inteligentes com regex, dias da semana, valores e mais
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !description}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Advanced Pattern Creator Modal */}
      {showAdvancedPatternCreator && (
        <AdvancedPatternCreator
          categories={categories}
          onClose={() => setShowAdvancedPatternCreator(false)}
          onSave={handleSavePattern}
          initialData={{
            description: transaction.original_description || description,
            categoryId: categoryId ?? undefined,
            amount: transaction.amount,
            expectedDay: new Date(transaction.transaction_date).getDate(),
          }}
        />
      )}
    </div>
  );
}

