import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import CategoryBudgetDashboard from './components/CategoryBudgetDashboard'
import PatternManager from './components/PatternManager'
import CategoryManager from './components/CategoryManager'
import UncategorizedTransactions from './components/UncategorizedTransactions'

type View = 'dashboard' | 'transactions' | 'budgets' | 'patterns' | 'categories' | 'uncategorized';

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                Celeiro 🌾
              </button>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('transactions')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentView === 'transactions'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Transações
                </button>
                <button
                  onClick={() => setCurrentView('budgets')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentView === 'budgets'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Orçamentos
                </button>
                <button
                  onClick={() => setCurrentView('patterns')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentView === 'patterns'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  🎯 Padrões
                </button>
                <button
                  onClick={() => setCurrentView('categories')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentView === 'categories'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📂 Categorias
                </button>
                {currentView === 'budgets' && (
                  <button
                    onClick={() => {
                      // Scroll to current month budget card
                      const currentMonthElement = document.getElementById('current-month-budget');
                      if (currentMonthElement) {
                        currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    📅 Este mês
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
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
