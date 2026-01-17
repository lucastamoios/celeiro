import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import OrganizationSwitcher from './OrganizationSwitcher';
import { User, FolderOpen, Workflow, Tag, LogOut, ChevronDown, Building2 } from 'lucide-react';
import type { SettingsTab } from './SettingsPage';

interface UserAvatarMenuProps {
  onNavigateToSettings: (tab?: SettingsTab) => void;
}

// Get initials from email
function getInitials(email: string): string {
  const name = email.split('@')[0];
  if (name.length >= 2) {
    return name.substring(0, 2).toUpperCase();
  }
  return name.toUpperCase();
}

export default function UserAvatarMenu({ onNavigateToSettings }: UserAvatarMenuProps) {
  const { userEmail, logout } = useAuth();
  const { activeOrganization, organizations, userInfo } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Use email from auth context or organization context
  const displayEmail = userEmail || userInfo?.email || 'usuario@email.com';
  const initials = getInitials(displayEmail);
  const hasMultipleOrgs = organizations.length > 1;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleMenuItemClick = (tab?: SettingsTab) => {
    setIsOpen(false);
    onNavigateToSettings(tab);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Menu da conta"
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all
          ${isOpen
            ? 'bg-wheat-100 text-wheat-700'
            : 'text-stone-600 hover:bg-stone-100'
          }
        `}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wheat-400 to-wheat-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
          {initials}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Opções da conta"
          className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wheat-400 to-wheat-600 flex items-center justify-center text-white font-semibold shadow-sm">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{displayEmail}</p>
                <p className="text-xs text-stone-500 truncate">
                  {activeOrganization?.name || 'Sem organização'}
                </p>
              </div>
            </div>
          </div>

          {/* Organization Switcher (only if multiple orgs) */}
          {hasMultipleOrgs && (
            <div className="px-3 py-2 border-b border-stone-100">
              <OrganizationSwitcher onClose={() => setIsOpen(false)} />
            </div>
          )}

          {/* Menu Items */}
          <div className="py-2">
            <button
              role="menuitem"
              onClick={() => handleMenuItemClick('conta')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <User className="w-4 h-4 text-stone-500" />
              <span>Sua Conta</span>
            </button>

            <button
              role="menuitem"
              onClick={() => handleMenuItemClick('categorias')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-stone-500" />
              <span>Categorias</span>
            </button>

            <button
              role="menuitem"
              onClick={() => handleMenuItemClick('padroes')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Workflow className="w-4 h-4 text-stone-500" />
              <span>Padrões</span>
            </button>

            <button
              role="menuitem"
              onClick={() => handleMenuItemClick('tags')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Tag className="w-4 h-4 text-stone-500" />
              <span>Tags</span>
            </button>

            <button
              role="menuitem"
              onClick={() => handleMenuItemClick('organizacao')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Building2 className="w-4 h-4 text-stone-500" />
              <span>Organização</span>
            </button>
          </div>

          {/* Logout Section */}
          <div className="border-t border-stone-100 pt-2">
            <button
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rust-600 hover:bg-rust-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>

          {/* Version Footer */}
          <div className="border-t border-stone-100 mt-2 pt-2 px-4 pb-1">
            <p className="text-xs text-stone-400">Celeiro v1.0.0</p>
          </div>
        </div>
      )}
    </div>
  );
}
