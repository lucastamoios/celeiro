import { useState, useRef, useEffect, useCallback } from 'react';

interface InlineEditTextProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  isIgnored?: boolean;
}

/** Inline editable text field. Click to edit, Enter/blur to save, Escape to cancel. */
export default function InlineEditText({ value, onSave, className = '', isIgnored = false }: InlineEditTextProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(value);
    setEditing(true);
  }, [value]);

  const handleSave = useCallback(async () => {
    if (savingRef.current) return;
    const trimmed = editValue.trim();
    if (trimmed === value || trimmed === '') {
      setEditing(false);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      setEditValue(value);
      setEditing(false);
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [editValue, value, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(value);
      setEditing(false);
    }
  }, [handleSave, value]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className={`w-full px-2 py-1 text-sm border border-wheat-400 rounded focus:outline-none focus:ring-2 focus:ring-wheat-500 bg-stone-50 ${saving ? 'opacity-50' : ''}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`truncate cursor-text rounded px-1 -mx-1 hover:bg-wheat-50 transition-colors ${className} ${isIgnored ? 'line-through' : ''} ${saving ? 'opacity-50' : ''}`}
      title="Clique para editar"
    >
      {value}
      {isIgnored && (
        <span className="ml-2 text-xs bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-medium">IGNORADA</span>
      )}
    </div>
  );
}
