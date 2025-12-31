import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Custom hook to handle dropdown/menu closing behavior.
 *
 * Closes the dropdown when:
 * 1. User clicks outside the dropdown container
 * 2. User presses the Escape key
 *
 * @param isOpen - Whether the dropdown is currently open
 * @param onClose - Callback to close the dropdown
 * @returns ref - Attach this ref to the dropdown container element
 *
 * @example
 * const [showMenu, setShowMenu] = useState(false);
 * const menuRef = useDropdownClose(showMenu, () => setShowMenu(false));
 *
 * return (
 *   <div className="relative">
 *     <button onClick={() => setShowMenu(!showMenu)}>Menu</button>
 *     {showMenu && (
 *       <div ref={menuRef} className="absolute ...">
 *         Menu items...
 *       </div>
 *     )}
 *   </div>
 * );
 */
export function useDropdownClose<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose: () => void
): RefObject<T | null> {
  const ref = useRef<T>(null);
  // Use a ref to store the latest onClose so we don't need it in effect deps
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Track if we should skip the first click (the one that opened the menu)
  const isFirstClickRef = useRef(true);

  useEffect(() => {
    if (!isOpen) {
      isFirstClickRef.current = true;
      return;
    }

    // Reset the flag when menu opens
    isFirstClickRef.current = true;

    const handleClickOutside = (event: MouseEvent) => {
      // Skip the first click (the one that opened the menu)
      if (isFirstClickRef.current) {
        isFirstClickRef.current = false;
        return;
      }

      // Check if click is outside the dropdown
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onCloseRef.current();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    // Add listeners immediately - the isFirstClickRef handles the timing
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  return ref;
}
