import type { ReactNode } from 'react';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X } from 'lucide-react';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the modal should close (ESC, backdrop click, or X button) */
  onClose: () => void;
  /** Modal title displayed in the header */
  title: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Main content of the modal */
  children: ReactNode;
  /** Footer content (typically action buttons). If not provided, no footer is shown */
  footer?: ReactNode;
  /** Maximum width of the modal. Defaults to 'md' */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show the close X button in the header. Defaults to true */
  showCloseButton?: boolean;
  /** Whether clicking the backdrop closes the modal. Defaults to true */
  closeOnBackdropClick?: boolean;
  /** Custom gradient colors for the header. Defaults to wheat */
  headerGradient?: 'wheat' | 'sage' | 'rust' | 'stone';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const gradientClasses = {
  wheat: 'from-wheat-500 to-wheat-600',
  sage: 'from-sage-500 to-sage-600',
  rust: 'from-rust-500 to-rust-600',
  stone: 'from-stone-600 to-stone-700',
};

const subtitleClasses = {
  wheat: 'text-wheat-100',
  sage: 'text-sage-100',
  rust: 'text-rust-100',
  stone: 'text-stone-300',
};

/**
 * Reusable Modal component with premium styling
 *
 * Features:
 * - Gradient header with title and optional subtitle
 * - Backdrop blur effect
 * - ESC key to close
 * - Backdrop click to close (optional)
 * - Close X button (optional)
 * - Footer section for actions
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Edit Category"
 *   subtitle="Change the name and icon"
 *   footer={
 *     <>
 *       <Modal.CancelButton onClick={() => setShowModal(false)}>Cancel</Modal.CancelButton>
 *       <Modal.SubmitButton onClick={handleSubmit} loading={saving}>Save</Modal.SubmitButton>
 *     </>
 *   }
 * >
 *   <form>...</form>
 * </Modal>
 * ```
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  headerGradient = 'wheat',
}: ModalProps) {
  const { handleBackdropClick, handleBackdropMouseDown } = useModalDismiss(onClose);

  if (!isOpen) return null;

  const handleBackdrop = closeOnBackdropClick
    ? { onClick: handleBackdropClick, onMouseDown: handleBackdropMouseDown }
    : {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
        {...handleBackdrop}
      />

      {/* Modal Container */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} mx-4 overflow-hidden max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradientClasses[headerGradient]} px-6 py-5 flex-shrink-0`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              {subtitle && (
                <p className={`${subtitleClasses[headerGradient]} text-sm mt-1`}>{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-1 -m-1 rounded-lg hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-stone-50 flex items-center justify-end gap-3 flex-shrink-0 border-t border-stone-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponents for consistent button styling

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

interface SubmitButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  variant?: 'wheat' | 'sage' | 'rust';
}

const variantClasses = {
  wheat: 'bg-gradient-to-r from-wheat-500 to-wheat-600 shadow-wheat-500/25 hover:shadow-wheat-500/40',
  sage: 'bg-gradient-to-r from-sage-500 to-sage-600 shadow-sage-500/25 hover:shadow-sage-500/40',
  rust: 'bg-gradient-to-r from-rust-500 to-rust-600 shadow-rust-500/25 hover:shadow-rust-500/40',
};

/**
 * Cancel button styled for modal footers
 */
Modal.CancelButton = function CancelButton({
  children,
  onClick,
  disabled = false,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 text-stone-700 font-medium hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
};

/**
 * Submit/Primary action button styled for modal footers
 */
Modal.SubmitButton = function SubmitButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  loadingText,
  type = 'button',
  variant = 'wheat',
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-5 py-2.5 ${variantClasses[variant]} text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2`}
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * Danger/Delete button styled for modal footers
 */
Modal.DangerButton = function DangerButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  loadingText,
  type = 'button',
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="px-5 py-2.5 bg-gradient-to-r from-rust-500 to-rust-600 text-white font-semibold rounded-xl shadow-lg shadow-rust-500/25 hover:shadow-rust-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </button>
  );
};
