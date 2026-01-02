import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to handle modal dismissal via ESC key and click outside
 * @param onClose - Function to call when modal should close
 */
export function useModalDismiss(onClose: () => void) {
  // Track where the mousedown started to prevent closing when
  // user starts a click inside modal but releases outside (e.g., dropdown selection)
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

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

  // Track where mousedown started
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  // Only close if BOTH mousedown AND mouseup happened on the backdrop
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only close if:
    // 1. Click (mouseup) is directly on the backdrop
    // 2. Mousedown also started on the backdrop
    const clickedOnBackdrop = e.target === e.currentTarget;
    const mouseDownOnBackdrop = mouseDownTargetRef.current === e.currentTarget;

    if (clickedOnBackdrop && mouseDownOnBackdrop) {
      onClose();
    }

    // Reset for next interaction
    mouseDownTargetRef.current = null;
  }, [onClose]);

  return { handleBackdropClick, handleBackdropMouseDown };
}
