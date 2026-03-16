import { useState, useRef, useEffect, useCallback } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { Transaction } from '../types/transaction';

interface ActionMenuProps {
  transaction: Transaction;
  onEditFull: (transaction: Transaction) => void;
}

/** Row action menu with less-frequent operations. */
export default function ActionMenu({ transaction, onEditFull }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(prev => !prev);
  }, []);

  const handleEditFull = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    onEditFull(transaction);
  }, [onEditFull, transaction]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
        title="Mais ações"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-stone-50 border border-stone-200 rounded-lg shadow-lg z-30 py-1">
          <button
            onClick={handleEditFull}
            className="w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-wheat-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar transação
          </button>
        </div>
      )}
    </div>
  );
}
