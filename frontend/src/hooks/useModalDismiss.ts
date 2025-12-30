import { useEffect, useCallback } from 'react';

/**
 * Hook to handle modal dismissal via ESC key and click outside
 * @param onClose - Function to call when modal should close
 */
export function useModalDismiss(onClose: () => void) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return a click handler for the backdrop
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop (not the modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return { handleBackdropClick };
}
