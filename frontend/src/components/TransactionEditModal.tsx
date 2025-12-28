import { useState } from 'react';
import type { Transaction } from '../types/transaction';
import type { Category } from '../types/category';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import { CATEGORY_COLORS } from '../utils/colors';
import AdvancedPatternCreator, { type AdvancedPattern } from './AdvancedPatternCreator';

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
  
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const handleSave = async () => {
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
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
        throw new Error('Falha ao atualizar transação');
      }

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
      // 1. Create the pattern
      const response = await fetch(financialUrl('patterns'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pattern),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar padrão');
      }

      const result = await response.json();
      const patternId = result.data?.pattern_id;

      if (!patternId) {
        throw new Error('ID do padrão não foi retornado');
      }

      // 2. Apply pattern retroactively to all matching transactions
      const applyResponse = await fetch(
        financialUrl(`patterns/${patternId}/apply-retroactively`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Active-Organization': '1',
          },
        }
      );

      if (!applyResponse.ok) {
        console.error('Falha ao aplicar padrão retroativamente');
        // Don't throw - pattern was created successfully
      }

      // 3. Close modal and notify parent to refresh data
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
          transaction_type: transaction.transaction_type,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                <div className="mt-4 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-xl">{newCategoryIcon}</span>
                      Nova Categoria
                    </h4>
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
              placeholder="Adicione observações sobre esta transação"
            />
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

