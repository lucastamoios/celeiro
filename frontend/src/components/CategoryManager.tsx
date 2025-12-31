import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { financialUrl } from '../config/api';
import type { Category } from '../types/category';
import type { CategoryBudget, CreateCategoryBudgetRequest } from '../types/budget';
import type { ApiResponse } from '../types/transaction';
import { getCategoryBudgets, createCategoryBudget, updateCategoryBudget } from '../api/budget';
import { CATEGORY_COLORS, getCategoryColorStyle } from '../utils/colors';
import { FolderOpen, Folder, Plus } from 'lucide-react';

const AVAILABLE_ICONS = [
  // Food & Drinks
  '🍔', '🍕', '🍜', '🍱', '🍳', '☕', '🍺', '🍷', '🥗', '🧁',
  // Transport
  '🚗', '🚌', '🚇', '✈️', '🚕', '⛽', '🚲', '🛵',
  // Home & Living
  '🏠', '🏡', '🛋️', '🛏️', '🔑', '💡', '🚿', '🧹',
  // Health & Beauty
  '💊', '🏥', '💉', '🩺', '💅', '💇', '🧴', '🏋️',
  // Shopping & Fashion
  '🛒', '👕', '👗', '👟', '👜', '💎', '🛍️',
  // Tech & Entertainment
  '📱', '💻', '🎮', '🎬', '🎵', '📺', '🎧', '📸',
  // Education & Work
  '📚', '🎓', '📝', '💼', '📊', '💵',
  // Pets & Nature
  '🐕', '🐈', '🌱', '🌳', '🌸',
  // Gifts & Celebrations
  '🎁', '🎂', '🎉', '🎄',
  // Travel & Leisure
  '🏖️', '⛷️', '🎿', '🏕️', '🎢',
  // Finance
  '💰', '💳', '🏦', '📈', '💸',
  // Other
  '⭐', '❤️', '🔧', '📦', '🏆', '🎯', '📁'
];

function getCategoryColor(category: Category) {
  const hexColor = category.color || '#6B7280';
  const styles = getCategoryColorStyle(hexColor);

  return {
    // Use neutral card styling with colored left border accent
    cardStyle: {
      borderLeftColor: hexColor,
      borderLeftWidth: '4px',
    },
    // Colored icon container (small accent)
    accentStyle: styles.accent,
    // Color for small indicators
    dotColor: hexColor,
  };
}

export default function CategoryManager() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Map<number, CategoryBudget>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Create category modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [newCategoryType, setNewCategoryType] = useState<'expense' | 'income'>('expense');
  const [creating, setCreating] = useState(false);
  
  // Edit budget state
  const [editingBudget, setEditingBudget] = useState<number | null>(null);
  const [budgetValue, setBudgetValue] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'calculated' | 'maior'>('fixed');
  const [savingBudget, setSavingBudget] = useState(false);
  const budgetInputRef = useRef<HTMLInputElement>(null);

  // Edit color state
  const [editingColor, setEditingColor] = useState<number | null>(null);
  const [colorValue, setColorValue] = useState('#6B7280');

  // Edit category modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Delete category state
  const [deletingCategory, setDeletingCategory] = useState<number | null>(null);

  // Budget type labels
  const budgetTypeLabels: Record<string, string> = {
    fixed: 'Fixo',
    calculated: 'Calculado',
    maior: 'Maior',
  };
  
  // Current month info
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (editingBudget !== null && budgetInputRef.current) {
      budgetInputRef.current.focus();
      budgetInputRef.current.select();
    }
  }, [editingBudget]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEditModal) {
          handleCloseEditModal();
        } else if (showCreateModal) {
          setShowCreateModal(false);
          setNewCategoryName('');
          setNewCategoryIcon('📁');
          setNewCategoryType('expense');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEditModal, showCreateModal]);

  const fetchData = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch categories
      const response = await fetch(financialUrl('categories'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar categorias');
      }

      const data: ApiResponse<Category[]> = await response.json();
      setCategories(data.data || []);

      // Fetch budgets for current month
      const categoryBudgets = await getCategoryBudgets(
        { month: currentMonth, year: currentYear },
        { token, organizationId: '1' }
      );

      const budgetMap = new Map<number, CategoryBudget>();
      (categoryBudgets || []).forEach(budget => {
        budgetMap.set(budget.CategoryID, budget);
      });
      setBudgets(budgetMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!token || !newCategoryName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      // Select a color from the palette based on current number of user categories
      const userCategoriesCount = categories.filter(c => !c.is_system).length;
      const selectedColor = CATEGORY_COLORS[userCategoriesCount % CATEGORY_COLORS.length];

      const response = await fetch(financialUrl('categories'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          icon: newCategoryIcon,
          color: selectedColor,
          category_type: newCategoryType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Falha ao criar categoria');
      }

      setSuccess('Categoria criada com sucesso!');
      setShowCreateModal(false);
      setNewCategoryName('');
      setNewCategoryIcon('📁');
      setNewCategoryType('expense');
      await fetchData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEditBudget = (categoryId: number) => {
    const existingBudget = budgets.get(categoryId);
    setBudgetValue(existingBudget ? parseFloat(existingBudget.PlannedAmount).toFixed(2) : '');
    setBudgetType(existingBudget?.BudgetType || 'fixed');
    setEditingBudget(categoryId);
  };

  const handleSaveBudget = async (categoryId: number) => {
    if (!token) return;

    // For fixed budgets, require a valid amount
    // For calculated/maior budgets, allow empty/zero (will be computed)
    let amount = 0;
    if (budgetType === 'fixed') {
      amount = parseFloat(budgetValue.replace(',', '.'));
      if (isNaN(amount) || amount < 0) {
        setError('Por favor, insira um valor válido');
        return;
      }
    } else {
      // For calculated/maior, use provided value or default to 0
      const parsed = parseFloat(budgetValue.replace(',', '.'));
      amount = isNaN(parsed) ? 0 : parsed;
    }

    setSavingBudget(true);
    setError(null);

    try {
      const existingBudget = budgets.get(categoryId);

      if (existingBudget) {
        // Update existing budget
        await updateCategoryBudget(
          existingBudget.CategoryBudgetID,
          { planned_amount: amount, budget_type: budgetType },
          { token, organizationId: '1' }
        );
      } else {
        // Create new budget
        const data: CreateCategoryBudgetRequest = {
          category_id: categoryId,
          month: currentMonth,
          year: currentYear,
          budget_type: budgetType,
          planned_amount: amount,
        };
        await createCategoryBudget(data, { token, organizationId: '1' });
      }

      setSuccess('Orçamento salvo com sucesso!');
      setEditingBudget(null);
      setBudgetValue('');
      await fetchData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar orçamento');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleCancelEditBudget = () => {
    setEditingBudget(null);
    setBudgetValue('');
    setBudgetType('fixed');
  };

  const handleStartEditColor = (categoryId: number, currentColor: string) => {
    setColorValue(currentColor);
    setEditingColor(categoryId);
  };

  const handleSaveColor = async (categoryId: number) => {
    if (!token) return;

    try {
      const response = await fetch(`${financialUrl('categories')}/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Active-Organization': '1',
        },
        body: JSON.stringify({ color: colorValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category color');
      }

      setSuccess('Cor atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      await fetchData();
      setEditingColor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update color');
    }
  };

  const handleCancelEditColor = () => {
    setEditingColor(null);
    setColorValue('#6B7280');
  };

  const handleStartEditDetails = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditIcon(category.icon);
    setShowEditModal(true);
  };

  const handleSaveDetails = async () => {
    if (!token || !editingCategory || !editName.trim()) return;

    setSavingDetails(true);
    try {
      const response = await fetch(`${financialUrl('categories')}/${editingCategory.category_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Active-Organization': '1',
        },
        body: JSON.stringify({ name: editName.trim(), icon: editIcon }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      setSuccess('Categoria atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

      await fetchData();
      handleCloseEditModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingCategory(null);
    setEditName('');
    setEditIcon('');
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!token) return;

    try {
      const response = await fetch(`${financialUrl('categories')}/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': '1',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Falha ao excluir categoria');
      }

      setSuccess('Categoria excluída com sucesso!');
      setDeletingCategory(null);
      await fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir categoria');
      setDeletingCategory(null);
    }
  };

  const handleStartDelete = (categoryId: number) => {
    setDeletingCategory(categoryId);
  };

  const handleCancelDelete = () => {
    setDeletingCategory(null);
  };

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  const userCategories = categories.filter(c => !c.is_system);
  const systemCategories = categories.filter(c => c.is_system);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-stone-200 rounded w-48"></div>
          <div className="h-4 bg-stone-200 rounded w-72"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-stone-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Categorias</h1>
        <p className="text-stone-600">
          Gerencie suas categorias e orçamentos para {getMonthName(currentMonth)} de {currentYear}
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

      {/* Create Category Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="btn-primary mb-8"
      >
        <Plus className="w-5 h-5" />
        Nova Categoria
      </button>

      {/* User Categories Section */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <FolderOpen className="w-6 h-6 text-wheat-600" />
          <h2 className="text-xl font-semibold text-stone-900">
            Minhas Categorias
            <span className="ml-2 text-sm font-normal text-stone-500">({userCategories.length})</span>
          </h2>
        </div>

        {userCategories.length === 0 ? (
          <div className="bg-gradient-to-br from-stone-50 to-stone-100 border-2 border-dashed border-stone-300 rounded-2xl p-12 text-center">
            <div className="flex justify-center mb-4">
              <Folder className="w-14 h-14 text-stone-300" />
            </div>
            <p className="text-stone-600 font-medium mb-2">
              Você ainda não criou nenhuma categoria personalizada.
            </p>
            <p className="text-stone-500 text-sm">
              Clique em "Nova Categoria" para começar!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCategories.map((category) => {
              const colors = getCategoryColor(category);
              const budget = budgets.get(category.category_id);
              const isEditing = editingBudget === category.category_id;
              const isEditingColor = editingColor === category.category_id;

              return (
                <div
                  key={category.category_id}
                  className="relative bg-white border border-stone-200 rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:border-stone-300 group"
                  style={colors.cardStyle}
                >
                  {/* Floating action buttons - overlay on top right */}
                  {!isEditingColor && deletingCategory !== category.category_id && (
                    <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
                      <button
                        onClick={() => handleStartEditDetails(category)}
                        className="p-2 bg-white/70 backdrop-blur-sm hover:bg-white/90 rounded-lg shadow-sm hover:shadow"
                        title="Editar nome e ícone"
                      >
                        <svg className="w-4 h-4 text-stone-600 hover:text-stone-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleStartEditColor(category.category_id, category.color)}
                        className="p-2 bg-white/70 backdrop-blur-sm hover:bg-white/90 rounded-lg shadow-sm hover:shadow"
                        title="Editar cor"
                      >
                        <svg className="w-4 h-4 text-stone-600 hover:text-stone-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleStartDelete(category.category_id)}
                        className="p-2 bg-white/70 backdrop-blur-sm hover:bg-rust-100/90 rounded-lg shadow-sm hover:shadow"
                        title="Excluir categoria"
                      >
                        <svg className="w-4 h-4 text-stone-600 hover:text-rust-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {deletingCategory === category.category_id && (
                    <div className="absolute top-2 right-2 flex items-center gap-2 bg-rust-50/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-rust-200 z-10">
                      <span className="text-xs text-rust-700">Excluir?</span>
                      <button
                        onClick={() => handleDeleteCategory(category.category_id)}
                        className="px-2 py-1 bg-rust-500 text-white text-xs rounded hover:bg-rust-600"
                      >
                        Sim
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className="px-2 py-1 bg-stone-300 text-stone-700 text-xs rounded hover:bg-stone-400"
                      >
                        Não
                      </button>
                    </div>
                  )}
                  {/* Header with icon and name */}
                  <div className="flex items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg" style={colors.accentStyle}>
                        {category.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{category.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-stone-500">Personalizada</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            category.category_type === 'income'
                              ? 'bg-sage-100 text-sage-700'
                              : 'bg-rust-100 text-rust-700'
                          }`}>
                            {category.category_type === 'income' ? '📈 Receita' : '📉 Despesa'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color picker section */}
                  {isEditingColor && (
                    <div className="mb-4 pb-4 border-b border-stone-200/50">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <input
                              type="color"
                              value={colorValue}
                              onChange={(e) => setColorValue(e.target.value)}
                              className="w-16 h-16 rounded-xl border-2 border-stone-300 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                              style={{ padding: '4px' }}
                            />
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                              <svg className="w-3 h-3 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-stone-600 mb-1">Código da cor</label>
                            <input
                              type="text"
                              value={colorValue}
                              onChange={(e) => setColorValue(e.target.value)}
                              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:border-transparent"
                              placeholder="#6B7280"
                              maxLength={7}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveColor(category.category_id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors font-medium text-sm shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Salvar cor
                          </button>
                          <button
                            onClick={handleCancelEditColor}
                            className="px-4 py-2.5 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors font-medium text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Budget section */}
                  <div className="border-t border-stone-200/50 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-stone-600 font-medium">Orçamento mensal</span>
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEditBudget(category.category_id)}
                          className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Editar
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={budgetType}
                            onChange={(e) => setBudgetType(e.target.value as 'fixed' | 'calculated' | 'maior')}
                            className="px-2 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wheat-500 text-sm bg-white"
                            disabled={savingBudget}
                          >
                            <option value="fixed">Fixo</option>
                            <option value="calculated">Calculado</option>
                            <option value="maior">Maior</option>
                          </select>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">R$</span>
                            <input
                              ref={budgetInputRef}
                              type="text"
                              value={budgetValue}
                              onChange={(e) => setBudgetValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveBudget(category.category_id);
                                if (e.key === 'Escape') handleCancelEditBudget();
                              }}
                              className={`w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wheat-500 text-sm ${budgetType !== 'fixed' ? 'bg-stone-50' : ''}`}
                              placeholder={budgetType === 'fixed' ? '0,00' : '(opcional)'}
                              disabled={savingBudget}
                            />
                          </div>
                        </div>
                        {budgetType !== 'fixed' && (
                          <p className="text-xs text-stone-500">
                            💡 Para orçamentos calculados, o valor será baseado nas entradas planejadas
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveBudget(category.category_id)}
                            disabled={savingBudget}
                            className="flex-1 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Salvar
                          </button>
                          <button
                            onClick={handleCancelEditBudget}
                            disabled={savingBudget}
                            className="flex-1 py-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-bold text-stone-900">
                          {budget ? formatCurrency(budget.PlannedAmount) : (
                            <span className="text-stone-400 text-base font-normal">Não definido</span>
                          )}
                        </div>
                        {budget && (
                          <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                            {budgetTypeLabels[budget.BudgetType] || budget.BudgetType}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* System Categories Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔒</span>
          <h2 className="text-xl font-semibold text-stone-900">
            Categorias do Sistema
            <span className="ml-2 text-sm font-normal text-stone-500">({systemCategories.length})</span>
          </h2>
        </div>
        <p className="text-stone-500 text-sm mb-4">
          Estas categorias são padrão do sistema. Você pode definir orçamentos ou excluí-las se não precisar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemCategories.map((category) => {
            const colors = getCategoryColor(category);
            const budget = budgets.get(category.category_id);
            const isEditing = editingBudget === category.category_id;

            return (
              <div
                key={category.category_id}
                className="bg-white border border-stone-200 rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:border-stone-300 group"
                style={colors.cardStyle}
              >
                {/* Header with icon and name */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md" style={colors.accentStyle}>
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900">{category.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs text-stone-500 bg-stone-200/50 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Sistema
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          category.category_type === 'income'
                            ? 'bg-sage-100 text-sage-700'
                            : 'bg-rust-100 text-rust-700'
                        }`}>
                          {category.category_type === 'income' ? '📈 Receita' : '📉 Despesa'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {deletingCategory !== category.category_id ? (
                    <button
                      onClick={() => handleStartDelete(category.category_id)}
                      className="md:opacity-0 md:group-hover:opacity-100 transition-all p-2 hover:bg-rust-100 rounded-lg shadow-sm hover:shadow"
                      title="Excluir categoria"
                    >
                      <svg className="w-4 h-4 text-stone-600 hover:text-rust-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-rust-50 px-3 py-2 rounded-lg border border-rust-200">
                      <span className="text-xs text-rust-700">Excluir?</span>
                      <button
                        onClick={() => handleDeleteCategory(category.category_id)}
                        className="px-2 py-1 bg-rust-500 text-white text-xs rounded hover:bg-rust-600"
                      >
                        Sim
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className="px-2 py-1 bg-stone-300 text-stone-700 text-xs rounded hover:bg-stone-400"
                      >
                        Não
                      </button>
                    </div>
                  )}
                </div>

                {/* Budget section */}
                <div className="border-t border-stone-200/50 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-stone-600 font-medium">Orçamento mensal</span>
                    {!isEditing && (
                      <button
                        onClick={() => handleStartEditBudget(category.category_id)}
                        className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Editar
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={budgetType}
                          onChange={(e) => setBudgetType(e.target.value as 'fixed' | 'calculated' | 'maior')}
                          className="px-2 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wheat-500 text-sm bg-white"
                          disabled={savingBudget}
                        >
                          <option value="fixed">Fixo</option>
                          <option value="calculated">Calculado</option>
                          <option value="maior">Maior</option>
                        </select>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">R$</span>
                          <input
                            ref={budgetInputRef}
                            type="text"
                            value={budgetValue}
                            onChange={(e) => setBudgetValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveBudget(category.category_id);
                              if (e.key === 'Escape') handleCancelEditBudget();
                            }}
                            className={`w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wheat-500 text-sm ${budgetType !== 'fixed' ? 'bg-stone-50' : ''}`}
                            placeholder={budgetType === 'fixed' ? '0,00' : '(opcional)'}
                            disabled={savingBudget}
                          />
                        </div>
                      </div>
                      {budgetType !== 'fixed' && (
                        <p className="text-xs text-stone-500">
                          💡 Para orçamentos calculados, o valor será baseado nas entradas planejadas
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveBudget(category.category_id)}
                          disabled={savingBudget}
                          className="flex-1 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Salvar
                        </button>
                        <button
                          onClick={handleCancelEditBudget}
                          disabled={savingBudget}
                          className="flex-1 py-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-bold text-stone-900">
                        {budget ? formatCurrency(budget.PlannedAmount) : (
                          <span className="text-stone-400 text-base font-normal">Não definido</span>
                        )}
                      </div>
                      {budget && (
                        <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                          {budgetTypeLabels[budget.BudgetType] || budget.BudgetType}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-wheat-500 to-wheat-600 px-6 py-5">
              <h3 className="text-xl font-bold text-white">Nova Categoria</h3>
              <p className="text-wheat-100 text-sm mt-1">Crie uma categoria personalizada</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  Escolha um ícone
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewCategoryIcon(icon)}
                      className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all duration-200 ${
                        newCategoryIcon === icon
                          ? 'bg-wheat-500 text-white shadow-lg scale-110'
                          : 'bg-stone-100 hover:bg-stone-200'
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">
                    {newCategoryIcon}
                  </span>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ex: Academia, Streaming..."
                    className="w-full pl-14 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:border-transparent text-stone-900"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCategoryName.trim()) {
                        handleCreateCategory();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Category Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Tipo de categoria
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewCategoryType('expense')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                      newCategoryType === 'expense'
                        ? 'border-rust-500 bg-rust-50 text-rust-700'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span>📉</span>
                    <span className="font-medium">Despesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategoryType('income')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                      newCategoryType === 'income'
                        ? 'border-sage-500 bg-sage-50 text-sage-700'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span>📈</span>
                    <span className="font-medium">Receita</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-stone-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCategoryName('');
                  setNewCategoryIcon('📁');
                  setNewCategoryType('expense');
                }}
                className="px-5 py-2.5 text-stone-700 font-medium hover:bg-stone-200 rounded-xl transition-colors"
                disabled={creating}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={creating || !newCategoryName.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-wheat-500 to-wheat-600 text-white font-semibold rounded-xl shadow-lg shadow-wheat-500/25 hover:shadow-wheat-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                {creating ? (
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
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleCloseEditModal();
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-wheat-500 to-wheat-600 px-6 py-5">
              <h3 className="text-xl font-bold text-white">Editar Categoria</h3>
              <p className="text-wheat-100 text-sm mt-1">Altere o nome e ícone da categoria</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  Escolha um ícone
                </label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {AVAILABLE_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditIcon(icon)}
                      className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all duration-200 ${
                        editIcon === icon
                          ? 'bg-wheat-500 text-white shadow-lg scale-110'
                          : 'bg-stone-100 hover:bg-stone-200'
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">
                    {editIcon}
                  </span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Academia, Streaming..."
                    className="w-full pl-14 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:border-transparent text-stone-900"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editName.trim()) {
                        handleSaveDetails();
                      }
                      if (e.key === 'Escape') {
                        handleCloseEditModal();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-stone-50 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseEditModal}
                className="px-5 py-2.5 text-stone-700 font-medium hover:bg-stone-200 rounded-xl transition-colors"
                disabled={savingDetails}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={savingDetails || !editName.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-wheat-500 to-wheat-600 text-white font-semibold rounded-xl shadow-lg shadow-wheat-500/25 hover:shadow-wheat-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                {savingDetails ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Salvar Alterações
                  </>
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

