import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import TransactionList from './components/TransactionList'
import BudgetList from './components/BudgetList'
import BudgetDetail from './components/BudgetDetail'

type View = 'transactions' | 'budgets' | 'budget-detail';

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('transactions');
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);

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
              <div className="text-xl font-bold text-gray-900">
                Celeiro 🌾
              </div>
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
      {currentView === 'transactions' && <TransactionList />}
      {currentView === 'budgets' && (
        <BudgetList
          onViewDetails={(budgetId) => {
            setSelectedBudgetId(budgetId);
            setCurrentView('budget-detail');
          }}
        />
      )}
      {currentView === 'budget-detail' && selectedBudgetId && (
        <BudgetDetail
          budgetId={selectedBudgetId}
          onBack={() => {
            setCurrentView('budgets');
            setSelectedBudgetId(null);
          }}
        />
      )}
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
