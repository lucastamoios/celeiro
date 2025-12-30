import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Tag } from '../types/tag';
import { getTags } from '../api/tags';
import { getCategoryColorStyle } from '../utils/colors';

interface TagSelectorProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  disabled?: boolean;
}

export default function TagSelector({ selectedTagIds, onChange, disabled }: TagSelectorProps) {
  const { token } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [token]);

  const fetchTags = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const fetchedTags = await getTags({ token, organizationId: '1' });
      setTags(fetchedTags || []);
    } catch (err) {
      setError('Erro ao carregar tags');
      console.error('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: number) => {
    if (disabled) return;

    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const getTagStyle = (tag: Tag, isSelected: boolean) => {
    const colors = getCategoryColorStyle(tag.color || '#6B7280');

    if (isSelected) {
      return {
        backgroundColor: tag.color,
        borderColor: tag.color,
        color: '#fff',
      };
    }

    return {
      backgroundColor: colors.bg.backgroundColor,
      borderColor: colors.border.borderColor,
      color: tag.color,
    };
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-20 bg-gray-200 rounded-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        {error}
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="text-sm text-gray-500 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <span>🏷️</span>
        <span>Nenhuma tag criada ainda.</span>
        <span className="text-gray-400">Crie tags no menu "Tags".</span>
      </div>
    );
  }

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.tag_id));
  const unselectedTags = tags.filter(tag => !selectedTagIds.includes(tag.tag_id));

  return (
    <div className="space-y-2">
      {/* Selected Tags (always visible) */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <button
              key={tag.tag_id}
              onClick={() => toggleTag(tag.tag_id)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
              }`}
              style={getTagStyle(tag, true)}
              title="Clique para remover"
            >
              <span>{tag.icon}</span>
              <span>{tag.name}</span>
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Expand/Collapse button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <span>🏷️</span>
        <span>{isExpanded ? 'Ocultar tags' : 'Adicionar tags'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Available Tags (expandable) */}
      {isExpanded && unselectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {unselectedTags.map(tag => (
            <button
              key={tag.tag_id}
              onClick={() => toggleTag(tag.tag_id)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:scale-105'
              }`}
              style={getTagStyle(tag, false)}
              title="Clique para adicionar"
            >
              <span>{tag.icon}</span>
              <span>{tag.name}</span>
              <svg className="w-4 h-4 ml-0.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {isExpanded && unselectedTags.length === 0 && selectedTags.length === tags.length && (
        <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200">
          Todas as tags ja foram adicionadas.
        </div>
      )}
    </div>
  );
}
