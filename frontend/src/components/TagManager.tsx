import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Tag } from '../types/tag';
import { getTags, createTag, updateTag, deleteTag } from '../api/tags';
import { CATEGORY_COLORS, getCategoryColorStyle } from '../utils/colors';
import { Tag as TagIcon, Plus } from 'lucide-react';

const AVAILABLE_ICONS = [
  // Tags & Labels
  '🏷️', '📌', '🔖', '📎', '🎯', '⭐', '💫', '✨',
  // Status & Workflow
  '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚪', '⚫',
  // Finance
  '💰', '💳', '💵', '💸', '📈', '📉', '🏦', '💎',
  // Work & Projects
  '📂', '📁', '🗂️', '📋', '📊', '📝', '💼', '🎯',
  // People & Communication
  '👤', '👥', '🤝', '💬', '📧', '📞', '🔔',
  // Time & Calendar
  '📅', '⏰', '⏳', '🔄', '📆',
  // Priority & Importance
  '🚨', '⚠️', '❗', '❓', '✅', '❌', '🔥', '⚡',
  // Categories
  '🏠', '🚗', '🍔', '🎮', '📚', '🏥', '✈️', '🛒',
  // Misc
  '🎁', '🎉', '🔧', '🔐', '📦', '🎨', '🌟', '💡'
];

function getTagColor(tag: Tag) {
  const hexColor = tag.color || '#6B7280';
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

export default function TagManager() {
  const { token } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create tag modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('🏷️');
  const [newTagColor, setNewTagColor] = useState('#6B7280');
  const [creating, setCreating] = useState(false);

  // Edit tag modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
  const [deletingTag, setDeletingTag] = useState<number | null>(null);

  useEffect(() => {
    fetchTags();
  }, [token]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEditModal) {
          handleCloseEditModal();
        } else if (showCreateModal) {
          handleCloseCreateModal();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEditModal, showCreateModal]);

  const fetchTags = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedTags = await getTags({ token, organizationId: '1' });
      setTags(fetchedTags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!token || !newTagName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      await createTag(
        {
          name: newTagName.trim(),
          icon: newTagIcon,
          color: newTagColor,
        },
        { token, organizationId: '1' }
      );

      setSuccess('Tag criada com sucesso!');
      handleCloseCreateModal();
      await fetchTags();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar tag');
    } finally {
      setCreating(false);
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewTagName('');
    setNewTagIcon('🏷️');
    // Select next color from palette
    setNewTagColor(CATEGORY_COLORS[tags.length % CATEGORY_COLORS.length]);
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditIcon(tag.icon);
    setEditColor(tag.color);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!token || !editingTag || !editName.trim()) return;

    setSavingEdit(true);
    try {
      await updateTag(
        editingTag.tag_id,
        { name: editName.trim(), icon: editIcon, color: editColor },
        { token, organizationId: '1' }
      );

      setSuccess('Tag atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

      await fetchTags();
      handleCloseEditModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar tag');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTag(null);
    setEditName('');
    setEditIcon('');
    setEditColor('');
  };

  const handleStartDelete = (tagId: number) => {
    setDeletingTag(tagId);
  };

  const handleConfirmDelete = async (tagId: number) => {
    if (!token) return;

    try {
      await deleteTag(tagId, { token, organizationId: '1' });

      setSuccess('Tag excluida com sucesso!');
      setDeletingTag(null);
      await fetchTags();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir tag');
      setDeletingTag(null);
    }
  };

  const handleCancelDelete = () => {
    setDeletingTag(null);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-stone-200 rounded w-32"></div>
          <div className="h-4 bg-stone-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-stone-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Tags</h1>
          <p className="text-stone-600">
            Gerencie suas tags para organizar e filtrar transacoes
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

        {/* Create Tag Button */}
        <button
          onClick={() => {
            setNewTagColor(CATEGORY_COLORS[tags.length % CATEGORY_COLORS.length]);
            setShowCreateModal(true);
          }}
          className="btn-primary mb-8"
        >
          <Plus className="w-5 h-5" />
          Nova Tag
        </button>

        {/* Tags Grid */}
        {tags.length === 0 ? (
          <div className="bg-gradient-to-br from-stone-50 to-stone-100 border-2 border-dashed border-stone-300 rounded-2xl p-12 text-center">
            <div className="flex justify-center mb-4">
              <TagIcon className="w-14 h-14 text-stone-300" />
            </div>
            <p className="text-stone-600 font-medium mb-2">
              Voce ainda nao criou nenhuma tag.
            </p>
            <p className="text-stone-500 text-sm">
              Clique em "Nova Tag" para comecar!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((tag) => {
              const colors = getTagColor(tag);
              const isDeleting = deletingTag === tag.tag_id;

              return (
                <div
                  key={tag.tag_id}
                  className="bg-white border border-stone-200 rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:border-stone-300 group"
                  style={colors.cardStyle}
                >
                  {/* Header with icon and name */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                        style={colors.accentStyle}
                      >
                        {tag.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-stone-900">
                          {tag.name}
                        </h3>
                      </div>
                    </div>

                    {!isDeleting && (
                      <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleStartEdit(tag)}
                          className="p-2 hover:bg-white/80 rounded-lg shadow-sm hover:shadow"
                          title="Editar tag"
                        >
                          <svg className="w-4 h-4 text-stone-600 hover:text-stone-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleStartDelete(tag.tag_id)}
                          className="p-2 hover:bg-rust-100 rounded-lg shadow-sm hover:shadow"
                          title="Excluir tag"
                        >
                          <svg className="w-4 h-4 text-stone-600 hover:text-rust-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {isDeleting && (
                      <div className="flex items-center gap-2 bg-rust-50 px-3 py-2 rounded-lg border border-rust-200">
                        <span className="text-xs text-rust-700">Excluir?</span>
                        <button
                          onClick={() => handleConfirmDelete(tag.tag_id)}
                          className="px-2 py-1 bg-rust-500 text-white text-xs rounded hover:bg-rust-600"
                        >
                          Sim
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          className="px-2 py-1 bg-stone-300 text-stone-700 text-xs rounded hover:bg-stone-400"
                        >
                          Nao
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Tag Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
              onClick={handleCloseCreateModal}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-wheat-500 to-wheat-600 px-6 py-5">
                <h3 className="text-xl font-bold text-white">Nova Tag</h3>
                <p className="text-wheat-100 text-sm mt-1">Crie uma tag para organizar suas transacoes</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-3">
                    Escolha um icone
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                    {AVAILABLE_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewTagIcon(icon)}
                        className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all duration-200 ${
                          newTagIcon === icon
                            ? 'bg-wheat-500 text-white shadow-lg scale-110'
                            : 'bg-stone-100 hover:bg-stone-200'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-3">
                    Escolha uma cor
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.slice(0, 15).map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                          newTagColor === color
                            ? 'ring-2 ring-offset-2 ring-stone-400 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {/* Custom color picker */}
                    <div className="relative">
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border-2 border-stone-300"
                        title="Cor personalizada"
                      />
                    </div>
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Nome da tag
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: newTagColor }}
                    >
                      {newTagIcon}
                    </span>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Ex: Urgente, Revisado..."
                      className="w-full pl-16 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:border-transparent text-stone-900"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagName.trim()) {
                          handleCreateTag();
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
                  onClick={handleCloseCreateModal}
                  className="px-5 py-2.5 text-stone-700 font-medium hover:bg-stone-200 rounded-xl transition-colors"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateTag}
                  disabled={creating || !newTagName.trim()}
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
                      <span>{newTagIcon}</span>
                      Criar Tag
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Tag Modal */}
        {showEditModal && editingTag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
              onClick={handleCloseEditModal}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-wheat-500 to-wheat-600 px-6 py-5">
                <h3 className="text-xl font-bold text-white">Editar Tag</h3>
                <p className="text-wheat-100 text-sm mt-1">Altere os dados da tag</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-3">
                    Escolha um icone
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                    {AVAILABLE_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setEditIcon(icon)}
                        className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all duration-200 ${
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

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-3">
                    Escolha uma cor
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.slice(0, 15).map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                          editColor === color
                            ? 'ring-2 ring-offset-2 ring-stone-400 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {/* Custom color picker */}
                    <div className="relative">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border-2 border-stone-300"
                        title="Cor personalizada"
                      />
                    </div>
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Nome da tag
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: editColor }}
                    >
                      {editIcon}
                    </span>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ex: Urgente, Revisado..."
                      className="w-full pl-16 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:border-transparent text-stone-900"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editName.trim()) {
                          handleSaveEdit();
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
                  disabled={savingEdit}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editName.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-wheat-500 to-wheat-600 text-white font-semibold rounded-xl shadow-lg shadow-wheat-500/25 hover:shadow-wheat-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                >
                  {savingEdit ? (
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
                      Salvar Alteracoes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
