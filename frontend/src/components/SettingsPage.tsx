import { useState, useEffect } from 'react';
import { Settings, FolderOpen, Workflow, Tag, User, Building2 } from 'lucide-react';
import CategoryManager from './CategoryManager';
import PatternManager from './PatternManager';
import TagManager from './TagManager';
import AccountSettings from './AccountSettings';
import OrganizationSettings from './OrganizationSettings';

type SettingsTab = 'conta' | 'categorias' | 'padroes' | 'tags' | 'organizacao';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { id: 'conta', label: 'Sua Conta', icon: User },
  { id: 'categorias', label: 'Categorias', icon: FolderOpen },
  { id: 'padroes', label: 'Padrões', icon: Workflow },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'organizacao', label: 'Organização', icon: Building2 },
];

interface SettingsPageProps {
  initialTab?: SettingsTab;
}

export default function SettingsPage({ initialTab = 'conta' }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Update active tab when initialTab changes (from avatar menu navigation)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'categorias':
        return <CategoryManager />;
      case 'padroes':
        return <PatternManager />;
      case 'tags':
        return <TagManager />;
      case 'conta':
        return <AccountSettings />;
      case 'organizacao':
        return <OrganizationSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-wheat-600" />
          Configurações
        </h1>
        <p className="text-stone-600 mt-1">
          Gerencie sua conta, categorias, padrões e tags
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-stone-200 mb-6">
        <nav className="flex space-x-1 -mb-px" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${isActive
                    ? 'border-wheat-500 text-wheat-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
}
