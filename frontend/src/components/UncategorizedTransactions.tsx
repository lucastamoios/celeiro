import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import type { Transaction } from '../types/transaction';
import type { Category } from '../types/category';
import TransactionEditModal from './TransactionEditModal';

export default function UncategorizedTransactions() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Map<number, Category>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      // Fetch uncategorized transactions
      const txResponse = await fetch(financialUrl('transactions/uncategorized'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
        },
      });

      if (!txResponse.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const txData = await txResponse.json();
      setTransactions(txData.data || []);

      // Fetch categories
      const catResponse = await fetch(financialUrl('categories'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
        },
      });

      if (!catResponse.ok) {
        throw new Error('Failed to fetch categories');
      }

      const catData = await catResponse.json();
      const categoryMap = new Map<number, Category>();
      (catData.data || []).forEach((cat: Category) => categoryMap.set(cat.category_id, cat));
      setCategories(categoryMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleCloseEditModal = () => {
    setEditingTransaction(null);
  };

  const handleSaveTransaction = async () => {
    setSuccess('Transação atualizada com sucesso!');
    setTimeout(() => setSuccess(null), 3000);
    await fetchData();
    setEditingTransaction(null);
  };

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            📋 Transações Não Categorizadas
          </h1>
          <p className="text-stone-600">
            {transactions.length} {transactions.length === 1 ? 'transação' : 'transações'} aguardando classificação
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-rust-50 border border-rust-200 text-rust-700 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-rust-500 hover:text-rust-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-sage-50 border border-sage-200 text-sage-700 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Empty State */}
        {transactions.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-stone-300 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-stone-900 mb-2">
              Tudo categorizado!
            </h3>
            <p className="text-stone-600">
              Não há transações aguardando classificação no momento.
            </p>
          </div>
        ) : (
          /* Transactions List */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Categoria
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.transaction_id}
                      className="hover:bg-stone-50 cursor-pointer"
                      onClick={() => handleOpenEditModal(transaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                        {formatDate(transaction.transaction_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-900">
                        <div className="max-w-md truncate">{transaction.description}</div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        transaction.transaction_type === 'credit' ? 'text-sage-600' : 'text-rust-600'
                      }`}>
                        {transaction.transaction_type === 'credit' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(transaction);
                          }}
                          className="px-4 py-1.5 bg-wheat-50 text-wheat-600 rounded-lg hover:bg-wheat-100 text-sm font-medium transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          categories={categories}
          onClose={handleCloseEditModal}
          onSave={handleSaveTransaction}
        />
      )}
    </div>
  );
}

