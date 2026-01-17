import { useEffect, useState } from 'react';
import { Settings, FolderOpen, Workflow, Tag, User } from 'lucide-react';
import CategoryManager from './CategoryManager';
import PatternManager from './PatternManager';
import TagManager from './TagManager';
import AccountSettings from './AccountSettings';

export type SettingsTab = 'categorias' | 'padroes' | 'tags' | 'conta';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { id: 'categorias', label: 'Categorias', icon: FolderOpen },
  { id: 'padroes', label: 'Padrões', icon: Workflow },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'conta', label: 'Sua Conta', icon: User },
];

function isSettingsTab(tab: string): tab is SettingsTab {
  return tab === 'categorias' || tab === 'padroes' || tab === 'tags' || tab === 'conta';
}

function getSettingsTabFromUrl(): SettingsTab | null {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (!tab) return null;
  return isSettingsTab(tab) ? tab : null;
}

interface SettingsPageProps {
  initialTab?: SettingsTab;
}

export default function SettingsPage({ initialTab = 'categorias' }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => getSettingsTabFromUrl() ?? initialTab);

  // Update active tab when initialTab changes (from avatar menu navigation)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Keep tab in URL (and support reload / direct URL access)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = params.get('tab');
    if (current !== activeTab) {
      params.set('tab', activeTab);
      const nextUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', nextUrl);
    }
  }, [activeTab, initialTab]);

  // Support back/forward button
  useEffect(() => {
    const handlePopState = () => {
      const tab = getSettingsTabFromUrl();
      if (tab) setActiveTab(tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'categorias':
        return <CategoryManager />;
      case 'padroes':
        return <PatternManager embedded />;
      case 'tags':
        return <TagManager embedded />;
      case 'conta':
        return <AccountSettings />;
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
        <p className="text-stone-600 mt-1">Gerencie categorias, padrões, tags e sua conta</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-stone-200 mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('tab', tab.id);
                  const nextUrl = `${window.location.pathname}?${params.toString()}`;
                  window.history.pushState(null, '', nextUrl);
                  setActiveTab(tab.id);
                }}
                className={`
                  shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    isActive
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
      <div className="min-h-[400px]">{renderTabContent()}</div>
    </div>
  );
}
