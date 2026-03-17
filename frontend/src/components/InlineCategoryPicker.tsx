import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Category } from '../types/category';

interface InlineCategoryPickerProps {
  categoryId: number | null;
  categories: Map<number, Category>;
  transactionType: 'debit' | 'credit';
  onSave: (categoryId: number | null) => Promise<void>;
}

/** Inline category picker. Click category pill to open dropdown, select to save immediately. */
export default function InlineCategoryPicker({ categoryId, categories, transactionType, onSave }: InlineCategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const expectedType = transactionType === 'credit' ? 'income' : 'expense';
  const sortedCategories = useMemo(() =>
    Array.from(categories.values())
      .filter(c => c.category_type === expectedType)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, expectedType]
  );
  const filteredCategories = search
    ? sortedCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : sortedCategories;

  const currentCategory = categoryId ? categories.get(categoryId) : null;

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(prev => !prev);
    setSearch('');
  }, []);

  const handleSelect = useCallback(async (newCategoryId: number | null) => {
    if (newCategoryId === categoryId) {
      setOpen(false);
      setSearch('');
      return;
    }
    setSaving(true);
    try {
      await onSave(newCategoryId);
    } catch {
      // parent shows error via setError and reverts via fetchData
    } finally {
      setSaving(false);
      setOpen(false);
      setSearch('');
    }
  }, [categoryId, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setSearch('');
    }
  }, []);

  return (
    <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleToggle}
        disabled={saving}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`transition-colors rounded-full ${saving ? 'opacity-50' : 'hover:ring-2 hover:ring-wheat-300'}`}
        title="Clique para alterar categoria"
      >
        {currentCategory ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-wheat-100 text-wheat-700 rounded-full">
            <span>{currentCategory.icon}</span>
            <span>{currentCategory.name}</span>
          </span>
        ) : (
          <span className="text-stone-400 italic text-sm hover:text-wheat-600 transition-colors">
            Não classificada
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Selecionar categoria"
          className="absolute top-full left-0 mt-1 w-56 bg-stone-50 border border-stone-200 rounded-lg shadow-lg z-30 max-h-72 overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          <div className="p-2 border-b border-stone-200">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar categoria..."
              className="w-full px-2 py-1.5 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-wheat-500 bg-stone-50"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            <button
              role="option"
              aria-selected={categoryId === null}
              onClick={() => handleSelect(null)}
              className="w-full px-3 py-2 text-left text-sm text-stone-500 hover:bg-stone-100 italic"
            >
              Remover categoria
            </button>
            {filteredCategories.map(cat => (
              <button
                key={cat.category_id}
                role="option"
                aria-selected={cat.category_id === categoryId}
                onClick={() => handleSelect(cat.category_id)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-wheat-50 flex items-center gap-2 ${
                  cat.category_id === categoryId ? 'bg-wheat-50 text-wheat-800 font-medium' : 'text-stone-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
            {filteredCategories.length === 0 && search && (
              <div className="px-3 py-2 text-sm text-stone-400 italic">
                Nenhuma categoria encontrada
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
