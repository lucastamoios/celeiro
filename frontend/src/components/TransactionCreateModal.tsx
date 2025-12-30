import { useState } from 'react';
import type { Category } from '../types/category';
import { useAuth } from '../contexts/AuthContext';
import { createTransaction, type CreateTransactionRequest } from '../api/transactions';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface TransactionCreateModalProps {
  accountId: number;
  categories: Map<number, Category>;
  onClose: () => void;
  onSave: () => void;
}

export default function TransactionCreateModal({
  accountId,
  categories,
  onClose,
  onSave,
}: TransactionCreateModalProps) {
  const { token } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [transactionType, setTransactionType] = useState<'debit' | 'credit'>('debit');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(onClose);

  const handleSave = async () => {
    if (!token) return;

    // Validation
    if (!description.trim()) {
      setError('Descrição é obrigatória');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Valor deve ser maior que zero');
      return;
    }
    if (!transactionDate) {
      setError('Data é obrigatória');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data: CreateTransactionRequest = {
        description: description.trim(),
        amount: parsedAmount,
        transaction_date: transactionDate,
        transaction_type: transactionType,
      };

      if (categoryId) {
        data.category_id = categoryId;
      }
      if (notes.trim()) {
        data.notes = notes.trim();
      }

      await createTransaction(accountId, data, {
        token,
        organizationId: '1',
      });

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar transação');
    } finally {
      setSaving(false);
    }
  };

  const formatAmountForDisplay = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">Nova Transação</h2>
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
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Almoço, Compra no mercado..."
              autoFocus
            />
          </div>

          {/* Amount and Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0,00"
                />
              </div>
              {amount && parseFloat(amount) > 0 && (
                <p className="text-xs text-gray-500 mt-1">{formatAmountForDisplay(amount)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransactionType('debit')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  transactionType === 'debit'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">📉</span>
                <span className="font-medium">Despesa</span>
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('credit')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  transactionType === 'credit'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">📈</span>
                <span className="font-medium">Receita</span>
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <select
              value={categoryId || ''}
              onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sem categoria</option>
              {Array.from(categories.values())
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.icon} {category.name}
                  </option>
                ))}
            </select>
            {categoryId && categories.has(categoryId) && (
              <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-xl">{categories.get(categoryId)!.icon}</span>
                <span className="text-sm font-medium text-gray-700">{categories.get(categoryId)!.name}</span>
                <div
                  className="w-3 h-3 rounded-full ml-auto"
                  style={{ backgroundColor: categories.get(categoryId)!.color || '#6B7280' }}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Adicione observações (opcional)"
            />
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
            disabled={saving || !description.trim() || !amount || parseFloat(amount) <= 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Salvando...' : 'Criar Transação'}
          </button>
        </div>
      </div>
    </div>
  );
}
