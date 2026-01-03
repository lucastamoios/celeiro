import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { UsersList } from './components/UsersList';
import { InvitesList } from './components/InvitesList';
import { InviteModal } from './components/InviteModal';
import { LogOut, UserPlus, Shield } from 'lucide-react';

function Dashboard() {
  const { logout, sessionInfo } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleInviteSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Celeiro Backoffice</h1>
                <p className="text-sm text-gray-500">
                  {sessionInfo?.user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Convidar Usuário
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Users List - Takes 2/3 of the space */}
          <div className="lg:col-span-2">
            <UsersList />
          </div>

          {/* Invites List - Takes 1/3 of the space */}
          <div>
            <InvitesList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isSuperAdmin } = useAuth();

  // Show login if not authenticated or not super admin
  if (!isAuthenticated || !isSuperAdmin) {
    return <Login />;
  }

  return <Dashboard />;
}
