import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loginWithPassword, register, loginWithGoogle } from '../api/auth';
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

type AuthMode = 'magic' | 'password' | 'register';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Extend window for Google Identity Services and reCAPTCHA
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function getRecaptchaToken(action: string): Promise<string> {
  if (!RECAPTCHA_SITE_KEY) return '';
  await loadScript(`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`);
  return new Promise((resolve) => {
    window.grecaptcha!.ready(() => {
      window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve);
    });
  });
}

export default function LoginForm() {
  const urlParams = getUrlParams();
  const [email, setEmail] = useState(urlParams.email);
  const [code, setCode] = useState(urlParams.code);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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

  const performRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const recaptchaToken = await getRecaptchaToken('register');
      const authResult = await register(name, email, password, recaptchaToken);
      login(authResult.session_token, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google login não está configurado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await loadScript('https://accounts.google.com/gsi/client');

      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: async (response) => {
          if (response.error || !response.access_token) {
            setError('Falha na autenticação com Google');
            setLoading(false);
            return;
          }

          try {
            const recaptchaToken = await getRecaptchaToken('google_login');
            const authResult = await loginWithGoogle(response.access_token, recaptchaToken);
            login(authResult.session_token, '');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha na autenticação com Google');
          } finally {
            setLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (err) {
      setError('Falha ao carregar autenticação Google');
      setLoading(false);
    }
  }, [login]);

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
    setName('');
    if (mode === 'magic') {
      setStep('email');
      setCode('');
      setCodeInfo(null);
    }
  };

  const renderGoogleButton = () => {
    if (!GOOGLE_CLIENT_ID) return null;

    return (
      <>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-stone-50 px-3 text-stone-400">ou</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </button>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Auth Mode Toggle */}
      <div className="flex bg-stone-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => switchToMode('magic')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
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
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            authMode === 'password'
              ? 'bg-stone-50 text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Senha
        </button>
        <button
          type="button"
          onClick={() => switchToMode('register')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            authMode === 'register'
              ? 'bg-stone-50 text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Criar conta
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

      {authMode === 'register' ? (
        <>
          <form onSubmit={performRegister} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-stone-700 mb-2">
                Nome
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-stone-700 mb-2">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-stone-700 mb-2">
                Senha
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
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
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          {renderGoogleButton()}
        </>
      ) : authMode === 'password' ? (
        <>
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

          {renderGoogleButton()}
        </>
      ) : step === 'email' ? (
        <>
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

          {renderGoogleButton()}
        </>
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
