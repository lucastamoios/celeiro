import { useState, useCallback, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import CategoryBudgetDashboard from './components/CategoryBudgetDashboard'
import UncategorizedTransactions from './components/UncategorizedTransactions'
import SavingsGoalsPage from './components/SavingsGoalsPage'
import SettingsPage from './components/SettingsPage'
import UserAvatarMenu from './components/UserAvatarMenu'
import {
  LayoutDashboard,
  CreditCard,
  PieChart,
  Target,
  Calendar,
  Menu,
  X,
  Wheat,
} from 'lucide-react'

type View = 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'settings' | 'uncategorized';
type SettingsTab = 'conta' | 'categorias' | 'padroes' | 'tags';

const VALID_VIEWS: View[] = ['dashboard', 'transactions', 'budgets', 'goals', 'settings', 'uncategorized'];
const VIEW_STORAGE_KEY = 'celeiro_current_view';

function getInitialView(): View {
  const stored = localStorage.getItem(VIEW_STORAGE_KEY);
  if (stored && VALID_VIEWS.includes(stored as View)) {
    return stored as View;
  }
  return 'dashboard';
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentViewState] = useState<View>(getInitialView);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('conta');

  const setCurrentView = useCallback((view: View) => {
    setCurrentViewState(view);
    localStorage.setItem(VIEW_STORAGE_KEY, view);
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

  if (!isAuthenticated) {
    return <Login />;
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
      <nav className="bg-white shadow-warm-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Desktop Nav */}
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-2 text-xl font-bold text-stone-900 hover:text-wheat-600 transition-colors"
              >
                <Wheat className="w-6 h-6 text-wheat-600" />
                <span>Celeiro</span>
              </button>
              {/* Desktop Navigation - Hidden on mobile/tablet */}
              <div className="hidden lg:flex space-x-1">
                <button
                  onClick={() => setCurrentView('transactions')}
                  className={navButtonClass('transactions')}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Transações</span>
                </button>
                <button
                  onClick={() => setCurrentView('budgets')}
                  className={navButtonClass('budgets')}
                >
                  <PieChart className="w-4 h-4" />
                  <span>Orçamentos</span>
                </button>
                <button
                  onClick={() => setCurrentView('goals')}
                  className={navButtonClass('goals')}
                >
                  <Target className="w-4 h-4" />
                  <span>Metas</span>
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
                onClick={() => setCurrentView('dashboard')}
                className={mobileNavButtonClass('dashboard')}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setCurrentView('transactions')}
                className={mobileNavButtonClass('transactions')}
              >
                <CreditCard className="w-5 h-5" />
                <span>Transações</span>
              </button>
              <button
                onClick={() => setCurrentView('budgets')}
                className={mobileNavButtonClass('budgets')}
              >
                <PieChart className="w-5 h-5" />
                <span>Orçamentos</span>
              </button>
              <button
                onClick={() => setCurrentView('goals')}
                className={mobileNavButtonClass('goals')}
              >
                <Target className="w-5 h-5" />
                <span>Metas</span>
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
      <AppContent />
    </AuthProvider>
  )
}

export default App
