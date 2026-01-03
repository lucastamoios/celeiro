import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setPassword } from '../api/auth';
import { API_CONFIG } from '../config/api';
import { Mail, LogOut, AlertCircle, Lock, Check, Eye, EyeOff } from 'lucide-react';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  has_password: boolean;
}

export default function AccountSettings() {
  const { userEmail, logout, token } = useAuth();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Fetch user info to get has_password
  useEffect(() => {
    async function fetchUserInfo() {
      if (!token) return;

      try {
        const response = await fetch(
          `${API_CONFIG.baseURL}${API_CONFIG.endpoints.accounts.me}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Active-Organization': '1',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUserInfo(data.data.user);
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserInfo();
  }, [token]);

  // Use email from auth context
  const displayEmail = userEmail || userInfo?.email || 'Email não disponível';

  const handleLogout = () => {
    if (showConfirmLogout) {
      logout();
    } else {
      setShowConfirmLogout(true);
    }
  };

  const isValidPassword = newPassword.length >= 8;
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmitPassword = isValidPassword && passwordsMatch && (!userInfo?.has_password || oldPassword.length > 0);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitPassword || !token) return;

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await setPassword(oldPassword, newPassword, { token });
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Update local state to reflect password is now set
      if (userInfo) {
        setUserInfo({ ...userInfo, has_password: true });
      }
      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Falha ao atualizar senha');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Account Info Section */}
      <div className="bg-white rounded-xl shadow-warm-sm border border-stone-200 overflow-hidden">
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

      {/* Password Management Section */}
      <div className="bg-white rounded-xl shadow-warm-sm border border-stone-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {userInfo?.has_password ? 'Alterar Senha' : 'Definir Senha'}
              </h2>
              <p className="text-sm text-stone-500">
                {userInfo?.has_password
                  ? 'Altere sua senha de acesso'
                  : 'Configure uma senha para fazer login mais rápido'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-4 text-center text-stone-500">Carregando...</div>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-rust-50 border border-rust-200 rounded-lg text-rust-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  Senha atualizada com sucesso!
                </div>
              )}

              {/* Old Password (only if user already has one) */}
              {userInfo?.has_password && (
                <div>
                  <label htmlFor="oldPassword" className="block text-sm font-medium text-stone-700 mb-2">
                    Senha atual
                  </label>
                  <div className="relative">
                    <input
                      id="oldPassword"
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                      required
                      className="input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-stone-700 mb-2">
                  {userInfo?.has_password ? 'Nova senha' : 'Senha'}
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="text-xs text-rust-500 mt-1">A senha deve ter pelo menos 8 caracteres</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700 mb-2">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente a senha"
                    required
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-rust-500 mt-1">As senhas não coincidem</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmitPassword || passwordLoading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading
                  ? 'Salvando...'
                  : userInfo?.has_password
                    ? 'Alterar Senha'
                    : 'Definir Senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
