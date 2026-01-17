import { useState, useCallback, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { OrganizationProvider, useOrganization } from './contexts/OrganizationContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import CategoryBudgetDashboard from './components/CategoryBudgetDashboard'
import UncategorizedTransactions from './components/UncategorizedTransactions'
import SavingsGoalsPage from './components/SavingsGoalsPage'
import SettingsPage, { type SettingsTab } from './components/SettingsPage'
import UserAvatarMenu from './components/UserAvatarMenu'
import AcceptInvite from './components/AcceptInvite'
import {
  LayoutDashboard,
  CreditCard,
  PieChart,
  Target,
  Calendar,
  Settings,
  Menu,
  X,
} from 'lucide-react'

type View = 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'settings' | 'uncategorized';

// Helper to get invite token from URL
function getInviteToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

// Helper to get view from URL params (for middle-click support)
function getViewFromUrl(): View | null {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view && VALID_VIEWS.includes(view as View)) {
    return view as View;
  }
  return null;
}

function replaceViewInUrl(view: View) {
  const params = new URLSearchParams(window.location.search);
  params.set('view', view);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', nextUrl);
}

function pushViewInUrl(view: View) {
  const params = new URLSearchParams(window.location.search);
  params.set('view', view);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState(null, '', nextUrl);
}
const VALID_VIEWS: View[] = ['dashboard', 'transactions', 'budgets', 'goals', 'settings', 'uncategorized'];
const VIEW_STORAGE_KEY = 'celeiro_current_view';

function getInitialView(): View {
  // Priority: URL param > sessionStorage > default
  const urlView = getViewFromUrl();
  if (urlView) {
    return urlView;
  }

  // Use sessionStorage for per-tab state (not shared across tabs)
  const stored = sessionStorage.getItem(VIEW_STORAGE_KEY);
  if (stored && VALID_VIEWS.includes(stored as View)) {
    return stored as View;
  }
  return 'dashboard';
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { isLoading: isOrgLoading, activeOrganization } = useOrganization();
  const [currentView, setCurrentViewState] = useState<View>(getInitialView);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('categorias');
  const [inviteToken, setInviteToken] = useState<string | null>(getInviteToken);

  const setCurrentView = useCallback((view: View) => {
    setCurrentViewState(view);
    sessionStorage.setItem(VIEW_STORAGE_KEY, view);
    pushViewInUrl(view);
    setIsMobileMenuOpen(false); // Close mobile menu when navigating
  }, []);

  const handleNavigateToSettings = useCallback((tab?: SettingsTab) => {
    if (tab) setSettingsTab(tab);
    setCurrentView('settings');
  }, [setCurrentView]);

  // Close mobile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Keep view in sync with browser history
  useEffect(() => {
    const handlePopState = () => {
      const urlView = getViewFromUrl();
      if (urlView) {
        setCurrentViewState(urlView);
        sessionStorage.setItem(VIEW_STORAGE_KEY, urlView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Ensure view is present for direct URL access and reloads
  useEffect(() => {
    const urlView = getViewFromUrl();
    if (urlView) {
      setCurrentViewState(urlView);
      sessionStorage.setItem(VIEW_STORAGE_KEY, urlView);
      return;
    }

    const stored = sessionStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && VALID_VIEWS.includes(stored as View)) {
      replaceViewInUrl(stored as View);
      return;
    }

    replaceViewInUrl('dashboard');
  }, []);

  // Handle invite acceptance flow
  if (inviteToken) {
    return (
      <AcceptInvite
        token={inviteToken}
        onComplete={() => setInviteToken(null)}
      />
    );
  }

  // Handler for middle-click (auxiliary click) to open in new tab
  // NOTE: All hooks must be declared before any conditional returns
  const handleAuxClick = useCallback((view: View) => (e: React.MouseEvent) => {
    // Middle-click (button 1) or Ctrl/Cmd+click
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(`${window.location.origin}${window.location.pathname}?view=${view}`, '_blank');
    }
  }, []);

  // === CONDITIONAL RETURNS (after all hooks) ===

  if (!isAuthenticated) {
    return <Login />;
  }

  // Wait for organization data to be loaded before rendering main content
  // This prevents race condition where components try to access activeOrganization before it's set
  if (isOrgLoading || !activeOrganization) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-wheat-200 border-t-wheat-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const navButtonClass = (view: View) =>
    `px-3 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 ${
      currentView === view
        ? 'bg-wheat-100 text-wheat-700'
        : 'text-stone-600 hover:bg-stone-100'
    }`;

  const mobileNavButtonClass = (view: View) =>
    `w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors ${
      currentView === view
        ? 'bg-wheat-100 text-wheat-700'
        : 'text-stone-600 hover:bg-stone-100'
    }`;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white shadow-warm-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Desktop Nav */}
            <div className="flex items-center space-x-6">
              <button
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleAuxClick('dashboard')(e);
                  } else {
                    setCurrentView('dashboard');
                  }
                }}
                onAuxClick={handleAuxClick('dashboard')}
                className="flex items-center gap-2 text-xl font-bold text-stone-900 hover:text-wheat-600 transition-colors"
              >
                <span className="text-2xl leading-none">🌾</span>
                <span className="tracking-tight">Celeiro</span>
              </button>
              {/* Desktop Navigation - Hidden on mobile/tablet */}
              <div className="hidden lg:flex space-x-1">
                <button
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      handleAuxClick('transactions')(e);
                    } else {
                      setCurrentView('transactions');
                    }
                  }}
                  onAuxClick={handleAuxClick('transactions')}
                  className={navButtonClass('transactions')}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Transações</span>
                </button>
                <button
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      handleAuxClick('budgets')(e);
                    } else {
                      setCurrentView('budgets');
                    }
                  }}
                  onAuxClick={handleAuxClick('budgets')}
                  className={navButtonClass('budgets')}
                >
                  <PieChart className="w-4 h-4" />
                  <span>Orçamentos</span>
                </button>
                <button
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      handleAuxClick('goals')(e);
                    } else {
                      setCurrentView('goals');
                    }
                  }}
                  onAuxClick={handleAuxClick('goals')}
                  className={navButtonClass('goals')}
                >
                  <Target className="w-4 h-4" />
                  <span>Metas</span>
                </button>
                <button
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      handleAuxClick('settings')(e);
                    } else {
                      setCurrentView('settings');
                    }
                  }}
                  onAuxClick={handleAuxClick('settings')}
                  className={navButtonClass('settings')}
                >
                  <Settings className="w-4 h-4" />
                  <span>Configurações</span>
                </button>
                {currentView === 'budgets' && (
                  <button
                    onClick={() => {
                      const currentMonthElement = document.getElementById('current-month-budget');
                      if (currentMonthElement) {
                        currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="px-3 py-2 text-sm font-medium text-wheat-700 bg-wheat-100 border border-wheat-300 rounded-lg hover:bg-wheat-200 transition-colors inline-flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Este mês</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Side: Avatar + Mobile Hamburger */}
            <div className="flex items-center gap-2">
              {/* User Avatar Menu - always visible */}
              <UserAvatarMenu onNavigateToSettings={handleNavigateToSettings} />

              {/* Mobile/Tablet Hamburger Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-16 left-0 right-0 bg-white border-b border-stone-200 shadow-lg z-50 lg:hidden">
            <div className="px-4 py-4 space-y-1">
              <button
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleAuxClick('dashboard')(e);
                  } else {
                    setCurrentView('dashboard');
                  }
                }}
                onAuxClick={handleAuxClick('dashboard')}
                className={mobileNavButtonClass('dashboard')}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleAuxClick('transactions')(e);
                  } else {
                    setCurrentView('transactions');
                  }
                }}
                onAuxClick={handleAuxClick('transactions')}
                className={mobileNavButtonClass('transactions')}
              >
                <CreditCard className="w-5 h-5" />
                <span>Transações</span>
              </button>
              <button
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleAuxClick('budgets')(e);
                  } else {
                    setCurrentView('budgets');
                  }
                }}
                onAuxClick={handleAuxClick('budgets')}
                className={mobileNavButtonClass('budgets')}
              >
                <PieChart className="w-5 h-5" />
                <span>Orçamentos</span>
              </button>
              <button
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleAuxClick('goals')(e);
                  } else {
                    setCurrentView('goals');
                  }
                }}
                onAuxClick={handleAuxClick('goals')}
                className={mobileNavButtonClass('goals')}
              >
                <Target className="w-5 h-5" />
                <span>Metas</span>
              </button>
              <button
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleAuxClick('settings')(e);
                  } else {
                    setCurrentView('settings');
                  }
                }}
                onAuxClick={handleAuxClick('settings')}
                className={mobileNavButtonClass('settings')}
              >
                <Settings className="w-5 h-5" />
                <span>Configurações</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      {currentView === 'dashboard' && <Dashboard onNavigateToUncategorized={() => setCurrentView('uncategorized')} />}
      {currentView === 'transactions' && <TransactionList />}
      {currentView === 'budgets' && <CategoryBudgetDashboard />}
      {currentView === 'goals' && <SavingsGoalsPage />}
      {currentView === 'settings' && <SettingsPage initialTab={settingsTab} />}
      {currentView === 'uncategorized' && <UncategorizedTransactions />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <AppContent />
      </OrganizationProvider>
    </AuthProvider>
  )
}

export default App
