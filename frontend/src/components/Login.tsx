import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ApiResponse } from '../types/transaction';
import { apiUrl, API_CONFIG } from '../config/api';

interface AuthResponse {
  session_token: string;
  session_created_at: string;
  session_expires_at: string;
  is_new_user: boolean;
}

// Helper to get URL params
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    email: params.get('email') || '',
    code: params.get('code') || '',
  };
}

// Clear URL params without page reload
function clearUrlParams() {
  window.history.replaceState({}, '', window.location.pathname);
}

export default function Login() {
  const urlParams = getUrlParams();
  const [email, setEmail] = useState(urlParams.email);
  const [code, setCode] = useState(urlParams.code);
  const [step, setStep] = useState<'email' | 'code'>(urlParams.email && urlParams.code ? 'code' : 'email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeInfo, setCodeInfo] = useState<string | null>(null);
  const { login } = useAuth();
  const autoLoginAttempted = useRef(false);

  // Auto-login when both email and code are provided via URL params (magic link)
  useEffect(() => {
    if (urlParams.email && urlParams.code && !autoLoginAttempted.current) {
      autoLoginAttempted.current = true;
      clearUrlParams(); // Clean URL immediately
      performLogin(urlParams.email, urlParams.code);
    }
  }, []); // Only run once on mount

  const performLogin = async (loginEmail: string, loginCode: string) => {
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
      setStep('code'); // Show code form so user can retry
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
      setCodeInfo('Check backend/localmailer/ directory for your magic code!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const validateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, code);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-wheat-50 to-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-warm-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Celeiro 🌾</h1>
          <p className="text-stone-600">Sistema de Gestão Financeira</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rust-50 border border-rust-200 rounded-lg text-rust-700 text-sm">
            {error}
          </div>
        )}

        {codeInfo && (
          <div className="mb-4 p-3 bg-wheat-50 border border-wheat-200 rounded-lg text-wheat-700 text-sm">
            {codeInfo}
          </div>
        )}

        {step === 'email' ? (
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
              Modo de desenvolvimento: O código será salvo em backend/localmailer/
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
    </div>
  );
}
