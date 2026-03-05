import { PieChart, Zap, CalendarCheck, Target } from 'lucide-react';
import { navigate } from '../utils/navigation';

const features = [
  {
    icon: PieChart,
    title: 'Controle de orçamento',
    description: 'Defina limites por categoria e acompanhe seus gastos mês a mês com visão clara do que sobra.',
  },
  {
    icon: Zap,
    title: 'Categorização automática',
    description: 'Regras inteligentes classificam suas transações automaticamente. Menos trabalho manual, mais precisão.',
  },
  {
    icon: CalendarCheck,
    title: 'Entradas planejadas',
    description: 'Registre gastos recorrentes e previstos antes de acontecerem. Seu orçamento reflete a realidade.',
  },
  {
    icon: Target,
    title: 'Metas de economia',
    description: 'Acompanhe o progresso das suas metas financeiras com indicadores visuais e histórico.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-100">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-start">
        {/* Background image */}
        <img
          src="/images/wheat-field.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay: dark at top for readability, fading to page bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/30 to-stone-100" />

        {/* Hero content — positioned in top negative space */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-16 sm:pt-24">
          <div className="flex items-center gap-3 mb-6">
            <img src="/celeiro-wheat-v2.svg" alt="" className="w-10 h-10 brightness-0 invert" />
            <span className="font-display text-3xl font-bold text-stone-50">Celeiro</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-50 max-w-2xl leading-tight mb-4">
            Suas finanças com clareza e propósito
          </h1>
          <p className="text-stone-200 text-lg sm:text-xl max-w-lg mb-8">
            Organize orçamentos, acompanhe gastos e alcance suas metas — tudo em um só lugar.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary text-base px-8 py-3"
          >
            Começar agora
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 text-center mb-4">
          Tudo que você precisa
        </h2>
        <p className="text-stone-500 text-center max-w-xl mx-auto mb-12">
          Ferramentas simples e poderosas para cuidar do seu dinheiro sem complicação.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="card flex gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-warm flex items-center justify-center"
                style={{ background: 'var(--accent-ghost)' }}
              >
                <feature.icon className="w-5 h-5" style={{ color: 'var(--accent-dark)' }} />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 mb-1">{feature.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16" style={{ background: 'var(--accent-ghost)' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
            Pronto para começar?
          </h2>
          <p className="text-stone-600 mb-8 max-w-md mx-auto">
            Crie sua conta e tenha controle total das suas finanças em minutos.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary text-base px-8 py-3"
          >
            Entrar no Celeiro
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-stone-400 text-sm">
          Celeiro — Gestão financeira pessoal
        </p>
      </footer>
    </div>
  );
}
