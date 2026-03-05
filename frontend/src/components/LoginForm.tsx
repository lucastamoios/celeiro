import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loginWithPassword } from '../api/auth';
import type { ApiResponse } from '../types/transaction';
import { apiUrl, API_CONFIG } from '../config/api';

interface AuthResponse {
  session_token: string;
  session_created_at: string;
  session_expires_at: string;
  is_new_user: boolean;
}

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    email: params.get('email') || '',
    code: params.get('code') || '',
  };
}

function clearUrlParams() {
  window.history.replaceState({}, '', window.location.pathname);
}

type AuthMode = 'magic' | 'password';

export default function LoginForm() {
  const urlParams = getUrlParams();
  const [email, setEmail] = useState(urlParams.email);
  const [code, setCode] = useState(urlParams.code);
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('magic');
  const [step, setStep] = useState<'email' | 'code'>(urlParams.email && urlParams.code ? 'code' : 'email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeInfo, setCodeInfo] = useState<string | null>(null);
  const { login } = useAuth();
  const autoLoginAttempted = useRef(false);

  useEffect(() => {
    if (urlParams.email && urlParams.code && !autoLoginAttempted.current) {
      autoLoginAttempted.current = true;
      clearUrlParams();
      performMagicLinkLogin(urlParams.email, urlParams.code);
    }
  }, []);

  const performMagicLinkLogin = async (loginEmail: string, loginCode: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(API_CONFIG.endpoints.auth.validate), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, code: loginCode })
      });

      if (!response.ok) {
        throw new Error('Código inválido ou expirado');
      }

      const data: ApiResponse<AuthResponse> = await response.json();
      login(data.data.session_token, loginEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido');
      setStep('code');
    } finally {
      setLoading(false);
    }
  };

  const performPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const authResult = await loginWithPassword(email, password);
      login(authResult.session_token, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(API_CONFIG.endpoints.auth.request), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to send code');
      }

      setStep('code');
      setCodeInfo('Enviamos um código de 4 dígitos para seu email!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const validateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    performMagicLinkLogin(email, code);
  };

  const switchToMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError(null);
    setPassword('');
    if (mode === 'magic') {
      setStep('email');
      setCode('');
      setCodeInfo(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auth Mode Toggle */}
      <div className="flex bg-stone-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => switchToMode('magic')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            authMode === 'magic'
              ? 'bg-stone-50 text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Magic Link
        </button>
        <button
          type="button"
          onClick={() => switchToMode('password')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            authMode === 'password'
              ? 'bg-stone-50 text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Senha
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rust-50 border border-rust-200 rounded-lg text-rust-700 text-sm">
          {error}
        </div>
      )}

      {codeInfo && authMode === 'magic' && (
        <div className="p-3 bg-wheat-50 border border-wheat-200 rounded-lg text-wheat-700 text-sm">
          {codeInfo}
        </div>
      )}

      {authMode === 'password' ? (
        <form onSubmit={performPasswordLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="input"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-xs text-stone-500 text-center">
            Não tem senha? Use Magic Link para entrar e configure sua senha nas configurações.
          </p>
        </form>
      ) : step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Enviando...' : 'Enviar código'}
          </button>

          <p className="text-xs text-stone-500 text-center">
            Enviaremos um código de 4 dígitos para seu email.
          </p>
        </form>
      ) : (
        <form onSubmit={validateCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-stone-700 mb-2">
              Código de 4 dígitos
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="1234"
              maxLength={4}
              pattern="[0-9]{4}"
              required
              className="input text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
              setCodeInfo(null);
            }}
            className="w-full text-stone-600 hover:text-stone-800 text-sm"
          >
            ← Voltar
          </button>
        </form>
      )}
    </div>
  );
}
