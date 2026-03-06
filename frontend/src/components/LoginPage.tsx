import LoginForm from './LoginForm';
import { navigate } from '../utils/navigation';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding image (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/images/wheat-ear.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-stone-900/40" />
        {/* Bottom-aligned branding */}
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16 w-full">
          <div className="flex items-center gap-1.5 mb-3">
            <img src="/celeiro-wheat-v4.svg" alt="" className="w-10 h-10 brightness-0 invert" />
            <span className="font-display text-4xl font-bold text-stone-50">Celeiro</span>
          </div>
          <p className="text-stone-200 text-lg max-w-sm">
            Organize suas finanças com clareza e simplicidade.
          </p>
        </div>
      </div>

      {/* Right Panel — Login form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-wheat-50 to-stone-100 p-6">
        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-1 mb-8">
          <img src="/celeiro-wheat-v4.svg" alt="" className="w-8 h-8" />
          <span className="font-display text-2xl font-bold text-stone-900">Celeiro</span>
        </div>

        <div className="bg-stone-50 rounded-2xl shadow-warm-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold text-stone-900 mb-1">Entrar</h1>
            <p className="text-stone-500 text-sm">Acesse sua conta para continuar</p>
          </div>
          <LoginForm />
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-6 text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          ← Voltar para a página inicial
        </button>
      </div>
    </div>
  );
}
