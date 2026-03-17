import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { OrganizationProvider, useOrganization } from './contexts/OrganizationContext'
import LoginPage from './components/LoginPage'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import CategoryBudgetDashboard from './components/CategoryBudgetDashboard'
import UncategorizedTransactions from './components/UncategorizedTransactions'
import SavingsGoalsPage from './components/SavingsGoalsPage'
import SettingsPage from './components/SettingsPage'
import UserAvatarMenu from './components/UserAvatarMenu'
import AcceptInvite from './components/AcceptInvite'
import ResetPassword from './components/ResetPassword'
import {
  LayoutDashboard,
  CreditCard,
  PieChart,
  Target,
  Menu,
  X,
} from 'lucide-react'

function AuthenticatedLayout() {
  const { isLoading: isOrgLoading, activeOrganization } = useOrganization();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

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

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 ${
      isActive
        ? 'bg-wheat-100 text-wheat-700'
        : 'text-stone-600 hover:bg-stone-100'
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-wheat-100 text-wheat-700'
        : 'text-stone-600 hover:bg-stone-100'
    }`;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-stone-50 shadow-warm-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Desktop Nav */}
            <div className="flex items-center space-x-6">
              <NavLink
                to="/"
                className="flex items-center gap-1 text-xl font-bold text-stone-900 hover:text-wheat-600 transition-colors"
              >
                <img src="/celeiro-wheat-v4.svg" alt="Celeiro" className="w-6 h-6" />
                <span>Celeiro</span>
              </NavLink>
              {/* Desktop Navigation - Hidden on mobile/tablet */}
              <div className="hidden lg:flex space-x-1">
                <NavLink to="/transactions" className={navLinkClass}>
                  <CreditCard className="w-4 h-4" />
                  <span>Transações</span>
                </NavLink>
                <NavLink to="/budgets" className={navLinkClass}>
                  <PieChart className="w-4 h-4" />
                  <span>Orçamentos</span>
                </NavLink>
                <NavLink to="/goals" className={navLinkClass}>
                  <Target className="w-4 h-4" />
                  <span>Metas</span>
                </NavLink>
              </div>
            </div>

            {/* Right Side: Avatar + Mobile Hamburger */}
            <div className="flex items-center gap-2">
              {/* User Avatar Menu - always visible */}
              <UserAvatarMenu />

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
          <div className="fixed top-16 left-0 right-0 bg-stone-50 border-b border-stone-200 shadow-lg z-50 lg:hidden">
            <div className="px-4 py-4 space-y-1">
              <NavLink to="/" end className={mobileNavLinkClass}>
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/transactions" className={mobileNavLinkClass}>
                <CreditCard className="w-5 h-5" />
                <span>Transações</span>
              </NavLink>
              <NavLink to="/budgets" className={mobileNavLinkClass}>
                <PieChart className="w-5 h-5" />
                <span>Orçamentos</span>
              </NavLink>
              <NavLink to="/goals" className={mobileNavLinkClass}>
                <Target className="w-5 h-5" />
                <span>Metas</span>
              </NavLink>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<TransactionList />} />
        <Route path="budgets" element={<CategoryBudgetDashboard />} />
        <Route path="goals" element={<SavingsGoalsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="uncategorized" element={<UncategorizedTransactions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function AcceptInviteRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return (
    <AcceptInvite
      token={token}
      onComplete={() => navigate('/', { replace: true })}
    />
  );
}

function ResetPasswordRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('reset-token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ResetPassword
      token={token}
      onComplete={() => navigate('/login', { replace: true })}
    />
  );
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

function LandingRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <AuthenticatedLayout />;
  }

  return <LandingPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/accept-invite" element={<AcceptInviteRoute />} />
      <Route path="/reset-password" element={<ResetPasswordRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/*" element={<LandingRoute />} />
    </Routes>
  );
}

function LegacyRedirects() {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle legacy ?view= URLs by redirecting to proper routes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view && location.pathname === '/') {
      const viewRoutes: Record<string, string> = {
        dashboard: '/',
        transactions: '/transactions',
        budgets: '/budgets',
        goals: '/goals',
        settings: '/settings',
        uncategorized: '/uncategorized',
      };
      const route = viewRoutes[view];
      if (route) {
        navigate(route, { replace: true });
      }
    }
  }, [location, navigate]);

  // Handle legacy auth URL params (?email=&code=) by redirecting to /login
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasAuthParams = !!(params.get('email') || params.get('code'));
    if (hasAuthParams && location.pathname !== '/login') {
      navigate('/login' + location.search, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

function AppContent() {
  return (
    <>
      <LegacyRedirects />
      <AppRoutes />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganizationProvider>
          <AppContent />
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
