import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { acceptAnyInvite } from '../api/organization';
import { Loader2, CheckCircle, XCircle, Building2 } from 'lucide-react';

type AcceptState = 'loading' | 'success' | 'error';

interface AcceptInviteProps {
  token: string;
  onComplete: () => void;
}

export default function AcceptInvite({ token, onComplete }: AcceptInviteProps) {
  const { login } = useAuth();
  const [state, setState] = useState<AcceptState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    async function acceptInvite() {
      if (!token) {
        setState('error');
        setError('Token de convite não encontrado');
        return;
      }

      try {
        const result = await acceptAnyInvite(token);

        // Login the user with the session token
        login(result.session_token, result.session_info.user.email);
        setIsNewUser(result.is_new_user);
        setState('success');

        // Clear the URL and redirect to dashboard after a brief delay
        setTimeout(() => {
          // Remove the token from URL
          window.history.replaceState({}, document.title, window.location.pathname);
          onComplete();
        }, 2000);
      } catch (err) {
        console.error('Failed to accept invite:', err);
        setState('error');
        setError(err instanceof Error ? err.message : 'Erro ao aceitar convite');
      }
    }

    acceptInvite();
  }, [token, login, onComplete]);

  const handleGoToLogin = () => {
    // Clear the URL and go to login
    window.history.replaceState({}, document.title, window.location.pathname);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-wheat-50 to-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {state === 'loading' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-wheat-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-wheat-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Processando Convite</h1>
            <p className="text-stone-600">Aguarde enquanto verificamos seu convite...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">
              {isNewUser ? 'Bem-vindo ao Celeiro!' : 'Convite Aceito!'}
            </h1>
            <p className="text-stone-600 mb-6">
              {isNewUser
                ? 'Sua conta foi criada e você foi adicionado à organização.'
                : 'Você foi adicionado à organização com sucesso.'}
            </p>
            <p className="text-sm text-stone-500">
              Redirecionando para o painel...
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-rust-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-rust-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Convite Inválido</h1>
            <p className="text-stone-600 mb-6">
              {error || 'O convite pode ter expirado ou já foi utilizado.'}
            </p>
            <button
              onClick={handleGoToLogin}
              className="btn-primary w-full"
            >
              Ir para Login
            </button>
          </div>
        )}

        {/* Logo/Branding */}
        <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-center gap-2 text-stone-400">
          <Building2 className="w-4 h-4" />
          <span className="text-sm">Celeiro</span>
        </div>
      </div>
    </div>
  );
}
