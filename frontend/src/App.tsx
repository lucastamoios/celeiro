import { useState, useCallback } from 'react'
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

  const setCurrentView = useCallback((view: View) => {
    setCurrentViewState(view);
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, []);

  if (!isAuthenticated) {
    return <Login />;
  }

  const navButtonClass = (view: View) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      currentView === view
        ? 'bg-wheat-100 text-wheat-700'
        : 'text-stone-600 hover:bg-stone-100'
    }`;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-warm-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="text-xl font-bold text-stone-900 hover:text-wheat-600 transition-colors"
              >
                Celeiro 🌾
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentView('transactions')}
                  className={navButtonClass('transactions')}
                >
                  💳 Transações
                </button>
                <button
                  onClick={() => setCurrentView('budgets')}
                  className={navButtonClass('budgets')}
                >
                  📊 Orçamentos
                </button>
                <button
                  onClick={() => setCurrentView('patterns')}
                  className={navButtonClass('patterns')}
                >
                  🔄 Padrões
                </button>
                <button
                  onClick={() => setCurrentView('categories')}
                  className={navButtonClass('categories')}
                >
                  📂 Categorias
                </button>
                <button
                  onClick={() => setCurrentView('tags')}
                  className={navButtonClass('tags')}
                >
                  🏷️ Tags
                </button>
                <button
                  onClick={() => setCurrentView('goals')}
                  className={navButtonClass('goals')}
                >
                  🎯 Metas
                </button>
                {currentView === 'budgets' && (
                  <button
                    onClick={() => {
                      const currentMonthElement = document.getElementById('current-month-budget');
                      if (currentMonthElement) {
                        currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-wheat-700 bg-wheat-100 border border-wheat-300 rounded-lg hover:bg-wheat-200 transition-colors"
                  >
                    📅 Este mês
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="btn-secondary"
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

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
