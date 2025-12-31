import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Tag } from '../types/tag';
import { getTags } from '../api/tags';

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

  // Returns the tag's color for the small indicator dot
  const getTagDotColor = (tag: Tag) => tag.color || '#6B7280';

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-20 bg-stone-200 rounded-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-rust-500 flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        {error}
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="text-sm text-stone-500 flex items-center gap-2 p-3 bg-stone-50 rounded-lg">
        <span>🏷️</span>
        <span>Nenhuma tag criada ainda.</span>
        <span className="text-stone-400">Crie tags no menu "Tags".</span>
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 border-wheat-500 bg-wheat-50 text-wheat-800 transition-all ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-wheat-100 hover:shadow-md'
              }`}
              title="Clique para remover"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getTagDotColor(tag) }}
              />
              <span>{tag.icon}</span>
              <span>{tag.name}</span>
              <svg className="w-4 h-4 ml-0.5 text-wheat-600" fill="currentColor" viewBox="0 0 20 20">
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
            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
        <div className="flex flex-wrap gap-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
          {unselectedTags.map(tag => (
            <button
              key={tag.tag_id}
              onClick={() => toggleTag(tag.tag_id)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-stone-300 bg-white text-stone-700 transition-all ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-stone-100 hover:border-stone-400 hover:shadow-sm'
              }`}
              title="Clique para adicionar"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getTagDotColor(tag) }}
              />
              <span>{tag.icon}</span>
              <span>{tag.name}</span>
              <svg className="w-4 h-4 ml-0.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {isExpanded && unselectedTags.length === 0 && selectedTags.length === tags.length && (
        <div className="text-sm text-stone-500 p-3 bg-stone-50 rounded-lg border border-stone-200">
          Todas as tags ja foram adicionadas.
        </div>
      )}
    </div>
  );
}
