import { useState, useRef, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { setDefaultOrganization } from '../api/organization';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Check, ChevronDown, Star } from 'lucide-react';
import type { Organization } from '../contexts/OrganizationContext';

interface OrganizationSwitcherProps {
  onClose?: () => void;
}

export default function OrganizationSwitcher({ onClose }: OrganizationSwitcherProps) {
  const { token } = useAuth();
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [settingDefault, setSettingDefault] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Don't show if only one organization
  if (organizations.length <= 1) {
    return null;
  }

  const handleSelectOrganization = (org: Organization) => {
    setActiveOrganization(org);
    setIsOpen(false);
    onClose?.();
  };

  const handleSetDefault = async (e: React.MouseEvent, org: Organization) => {
    e.stopPropagation();
    if (!token || settingDefault) return;

    setSettingDefault(org.organization_id);
    try {
      await setDefaultOrganization(org.organization_id, { token });
      // Update local state to reflect new default
      // Note: The context will refresh on next login, but we can update locally
    } catch (err) {
      console.error('Failed to set default organization:', err);
    } finally {
      setSettingDefault(null);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-stone-700 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-stone-500 flex-shrink-0" />
          <span className="truncate font-medium">
            {activeOrganization?.name || 'Selecionar organização'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50 max-h-60 overflow-y-auto"
        >
          {organizations.map((org) => {
            const isActive = activeOrganization?.organization_id === org.organization_id;
            const isSettingDefault = settingDefault === org.organization_id;

            return (
              <div
                key={org.organization_id}
                onClick={() => handleSelectOrganization(org)}
                className={`
                  flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
                  ${isActive ? 'bg-wheat-50' : 'hover:bg-stone-50'}
                `}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${isActive ? 'font-medium text-wheat-700' : 'text-stone-700'}`}>
                      {org.name}
                    </span>
                    {org.is_default && (
                      <Star className="w-3 h-3 text-wheat-500 fill-wheat-500 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-stone-500 capitalize">{org.user_role.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!org.is_default && (
                    <button
                      onClick={(e) => handleSetDefault(e, org)}
                      disabled={isSettingDefault}
                      title="Definir como padrão"
                      className="p-1 text-stone-400 hover:text-wheat-600 transition-colors disabled:opacity-50"
                    >
                      <Star className={`w-3.5 h-3.5 ${isSettingDefault ? 'animate-pulse' : ''}`} />
                    </button>
                  )}
                  {isActive && (
                    <Check className="w-4 h-4 text-wheat-600 flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
