import { useState, useRef, useLayoutEffect, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DropdownMenuProps {
  /** Inner content of the trigger button (typically an icon). */
  buttonContent: ReactNode;
  /** Classes applied to the trigger button. */
  buttonClassName?: string;
  /** Accessible label for the trigger button. */
  buttonAriaLabel?: string;
  /** Menu width in pixels. Defaults to 176 (w-44). */
  width?: number;
  /** Menu items. Receives a close() callback to dismiss the menu after an action. */
  children: (close: () => void) => ReactNode;
}

/**
 * A dropdown menu whose panel is rendered through a portal to document.body.
 *
 * Unlike an absolutely-positioned menu, the portal escapes any ancestor with
 * `overflow-hidden` (e.g. a rounded card), so the menu is never clipped. The
 * panel is positioned with `fixed` coordinates derived from the trigger's
 * bounding box, right-aligned to the trigger and flipped above when it would
 * overflow the viewport bottom.
 */
export default function DropdownMenu({
  buttonContent,
  buttonClassName,
  buttonAriaLabel,
  width = 176,
  children,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;

    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    let top = rect.bottom + 4;
    if (menuHeight && top + menuHeight > window.innerHeight - 8) {
      const above = rect.top - menuHeight - 4;
      if (above > 8) top = above;
    }

    setPos({ top, left });
  }, [width]);

  // Position before paint so the menu never flashes at the origin.
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const handle = () => updatePosition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={buttonClassName}
        aria-label={buttonAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {buttonContent}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: pos.top, left: pos.left, width }}
            className="bg-stone-50 rounded-lg shadow-warm-lg border border-stone-200 py-1 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {children(close)}
          </div>,
          document.body
        )}
    </>
  );
}
