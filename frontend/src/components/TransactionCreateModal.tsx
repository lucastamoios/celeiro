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

  const { handleBackdropClick, handleBackdropMouseDown } = useModalDismiss(onClose);

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
      className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-warm-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-stone-900">Nova Transação</h2>
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
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-rust-50 border border-rust-200 text-rust-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Descrição <span className="text-rust-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="Ex: Almoço, Compra no mercado..."
              autoFocus
            />
          </div>

          {/* Amount and Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Valor <span className="text-rust-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-transparent tabular-nums"
                  placeholder="0,00"
                />
              </div>
              {amount && parseFloat(amount) > 0 && (
                <p className="text-xs text-stone-500 mt-1 tabular-nums">{formatAmountForDisplay(amount)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Data <span className="text-rust-500">*</span>
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="input tabular-nums"
              />
            </div>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Tipo <span className="text-rust-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransactionType('debit')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  transactionType === 'debit'
                    ? 'border-rust-500 bg-rust-50 text-rust-700'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
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
                    ? 'border-sage-500 bg-sage-50 text-sage-700'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                <span className="text-lg">📈</span>
                <span className="font-medium">Receita</span>
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Categoria
            </label>
            <select
              value={categoryId || ''}
              onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
              className="input"
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
              <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-xl">{categories.get(categoryId)!.icon}</span>
                <span className="text-sm font-medium text-stone-700">{categories.get(categoryId)!.name}</span>
                <div
                  className="w-3 h-3 rounded-full ml-auto"
                  style={{ backgroundColor: categories.get(categoryId)!.color || '#78716C' }}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Adicione observações (opcional)"
            />
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
            disabled={saving || !description.trim() || !amount || parseFloat(amount) <= 0}
            className="btn-primary"
          >
            {saving ? 'Salvando...' : 'Criar Transação'}
          </button>
        </div>
      </div>
    </div>
  );
}
