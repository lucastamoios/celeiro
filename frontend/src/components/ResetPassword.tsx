import { useState } from 'react';
import { resetPassword } from '../api/auth';
import { Loader2, CheckCircle, XCircle, KeyRound } from 'lucide-react';

type ResetState = 'form' | 'submitting' | 'success' | 'error';

interface ResetPasswordProps {
  token: string;
  onComplete: () => void;
}

export default function ResetPassword({ token, onComplete }: ResetPasswordProps) {
  const [state, setState] = useState<ResetState>('form');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setState('submitting');
    try {
      await resetPassword(token, newPassword);
      setState('success');
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        onComplete();
      }, 2000);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Link inválido ou expirado');
    }
  };

  const handleGoToLogin = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-wheat-50 to-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        {(state === 'form' || state === 'submitting') && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-wheat-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-wheat-600" />
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mb-2">Nova senha</h1>
              <p className="text-stone-600">Crie uma nova senha para sua conta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wheat-500"
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wheat-500"
                  placeholder="Repita a senha"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={state === 'submitting'}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {state === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </button>
            </form>
          </>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Senha redefinida!</h1>
            <p className="text-stone-600 mb-4">Sua senha foi atualizada com sucesso.</p>
            <p className="text-sm text-stone-500">Redirecionando para o login...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Link inválido</h1>
            <p className="text-stone-600 mb-6">
              {error || 'O link pode ter expirado ou já foi utilizado.'}
            </p>
            <button onClick={handleGoToLogin} className="btn-primary w-full">
              Ir para Login
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-center gap-2 text-stone-400">
          <span className="text-sm">🌾 Celeiro</span>
        </div>
      </div>
    </div>
  );
}
