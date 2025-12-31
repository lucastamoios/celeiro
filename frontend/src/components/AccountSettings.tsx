import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, LogOut, AlertCircle } from 'lucide-react';

export default function AccountSettings() {
  const { userEmail, logout } = useAuth();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // Use email from auth context
  const displayEmail = userEmail || 'Email não disponível';

  const handleLogout = () => {
    if (showConfirmLogout) {
      logout();
    } else {
      setShowConfirmLogout(true);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl shadow-warm-sm border border-stone-200 overflow-hidden">
        {/* Account Info Section */}
        <div className="p-6 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Sua Conta</h2>

          <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-lg">
            <div className="w-12 h-12 bg-wheat-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-wheat-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Email</p>
              <p className="text-stone-900 font-medium">{displayEmail}</p>
            </div>
          </div>
        </div>

        {/* Logout Section */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-stone-700 mb-3">Sessão</h3>

          {showConfirmLogout ? (
            <div className="bg-rust-50 border border-rust-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rust-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-rust-800 font-medium">Confirmar saída</p>
                  <p className="text-rust-600 text-sm mt-1">
                    Você será desconectado e precisará fazer login novamente.
                  </p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 bg-rust-600 text-white rounded-lg hover:bg-rust-700 transition-colors font-medium text-sm"
                    >
                      Sim, sair
                    </button>
                    <button
                      onClick={() => setShowConfirmLogout(false)}
                      className="px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 text-rust-600 bg-rust-50 border border-rust-200 rounded-lg hover:bg-rust-100 transition-colors font-medium text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          )}
        </div>

        {/* App Info */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100">
          <p className="text-xs text-stone-400">
            Celeiro v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
