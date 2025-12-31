import { useState, useCallback, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import CategoryBudgetDashboard from './components/CategoryBudgetDashboard'
import PatternManager from './components/PatternManager'
import CategoryManager from './components/CategoryManager'
import TagManager from './components/TagManager'
import UncategorizedTransactions from './components/UncategorizedTransactions'
import SavingsGoalsPage from './components/SavingsGoalsPage'
import {
  LayoutDashboard,
  CreditCard,
  PieChart,
  Workflow,
  FolderOpen,
  Tag,
  Target,
  Calendar,
  LogOut,
  Menu,
  X,
  Wheat,
} from 'lucide-react'

type View = 'dashboard' | 'transactions' | 'budgets' | 'patterns' | 'categories' | 'tags' | 'uncategorized' | 'goals';

const VALID_VIEWS: View[] = ['dashboard', 'transactions', 'budgets', 'patterns', 'categories', 'tags', 'uncategorized', 'goals'];
const VIEW_STORAGE_KEY = 'celeiro_current_view';

function getInitialView(): View {
  const stored = localStorage.getItem(VIEW_STORAGE_KEY);
  if (stored && VALID_VIEWS.includes(stored as View)) {
    return stored as View;
  }
  return 'dashboard';
}

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const [currentView, setCurrentViewState] = useState<View>(getInitialView);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const setCurrentView = useCallback((view: View) => {
    setCurrentViewState(view);
    localStorage.setItem(VIEW_STORAGE_KEY, view);
    setIsMobileMenuOpen(false); // Close mobile menu when navigating
  }, []);

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
                  onClick={() => setCurrentView('patterns')}
                  className={navButtonClass('patterns')}
                >
                  <Workflow className="w-4 h-4" />
                  <span>Padrões</span>
                </button>
                <button
                  onClick={() => setCurrentView('categories')}
                  className={navButtonClass('categories')}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Categorias</span>
                </button>
                <button
                  onClick={() => setCurrentView('tags')}
                  className={navButtonClass('tags')}
                >
                  <Tag className="w-4 h-4" />
                  <span>Tags</span>
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

            {/* Desktop Logout Button */}
            <button
              onClick={logout}
              className="hidden lg:inline-flex items-center gap-2 btn-secondary"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>

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
                onClick={() => setCurrentView('patterns')}
                className={mobileNavButtonClass('patterns')}
              >
                <Workflow className="w-5 h-5" />
                <span>Padrões</span>
              </button>
              <button
                onClick={() => setCurrentView('categories')}
                className={mobileNavButtonClass('categories')}
              >
                <FolderOpen className="w-5 h-5" />
                <span>Categorias</span>
              </button>
              <button
                onClick={() => setCurrentView('tags')}
                className={mobileNavButtonClass('tags')}
              >
                <Tag className="w-5 h-5" />
                <span>Tags</span>
              </button>
              <button
                onClick={() => setCurrentView('goals')}
                className={mobileNavButtonClass('goals')}
              >
                <Target className="w-5 h-5" />
                <span>Metas</span>
              </button>
              <div className="pt-3 border-t border-stone-200 mt-3">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-rust-600 hover:bg-rust-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      {currentView === 'dashboard' && <Dashboard onNavigateToUncategorized={() => setCurrentView('uncategorized')} />}
      {currentView === 'transactions' && <TransactionList />}
      {currentView === 'budgets' && <CategoryBudgetDashboard />}
      {currentView === 'patterns' && <PatternManager />}
      {currentView === 'categories' && <CategoryManager />}
      {currentView === 'tags' && <TagManager />}
      {currentView === 'uncategorized' && <UncategorizedTransactions />}
      {currentView === 'goals' && <SavingsGoalsPage />}
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
