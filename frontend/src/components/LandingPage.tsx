import { useRef } from 'react';
import { PieChart, Zap, CalendarCheck, Target } from 'lucide-react';
import { navigate } from '../utils/navigation';
import { ScrollVideo } from './landing/ScrollVideo';

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
  const scrollVideoRef = useRef<HTMLDivElement>(null);

  const scrollToDemo = () => {
    scrollVideoRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-0)' }}>
      {/* ── Hero Section — Full screen, dark, static ── */}
      <section
        className="relative min-h-screen flex items-center justify-center"
        style={{ overflow: 'hidden' }}
      >
        {/* Wheat field background */}
        <img
          src="/images/wheat-field.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(28,25,23,0.70)', zIndex: 1 }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
          {/* Badge */}
          <span
            className="inline-block mb-6 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase"
            style={{
              background: 'rgba(198,148,58,0.15)',
              color: '#C6943A',
              border: '1px solid rgba(198,148,58,0.25)',
            }}
          >
            Gestão financeira familiar
          </span>

          {/* Headline */}
          <h1
            className="font-display font-bold text-white leading-tight mb-6"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Você trabalha para sustentar sua família.
            <br />
            <span style={{ color: '#C6943A' }}>Mas quem cuida do que você ganhou?</span>
          </h1>

          {/* Subtitle */}
          <p className="text-stone-300 text-base sm:text-lg leading-relaxed max-w-xl mb-10">
            A maioria ganha o suficiente para uma vida boa.
            <br />
            O problema não é o salário — é não ter visão clara do que foi confiado a você.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary text-base px-8 py-3"
            >
              Começar a cuidar da minha família &rarr;
            </button>
            <button
              onClick={scrollToDemo}
              className="px-8 py-3 rounded-warm text-base font-semibold transition-colors"
              style={{
                color: '#FAFAF9',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              Ver como funciona &darr;
            </button>
          </div>
        </div>
      </section>

      {/* ── Scroll-driven Remotion chapters ── */}
      <ScrollVideo ref={scrollVideoRef} />

      {/* ── José Metaphor Interstitial ── */}
      <section className="py-20 px-6" style={{ background: 'var(--bg-0)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="mx-auto mb-6"
            style={{ width: 48, height: 2, backgroundColor: 'var(--accent)', borderRadius: 1 }}
          />
          <blockquote
            className="font-display text-xl sm:text-2xl font-bold leading-snug mb-6"
            style={{ color: 'var(--text-1)' }}
          >
            José não salvou o Egito porque tinha mais grãos que os outros.
            <br />
            Salvou porque{' '}
            <span style={{ color: 'var(--accent-dark)' }}>
              sabia exatamente o que tinha, o que precisava, e o que guardar.
            </span>
          </blockquote>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Isso é mordomia. Isso é liderança familiar.
          </p>
        </div>
      </section>

      {/* ── Features Section ── */}
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

      {/* ── CTA Section ── */}
      <section className="py-20" style={{ background: 'var(--accent-ghost)' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
            Se você é o responsável pelas finanças da sua família, este é o momento.
          </h2>
          <p className="text-stone-600 mb-10 max-w-lg mx-auto leading-relaxed">
            Não amanhã. Não quando "organizar as contas primeiro".
            <br />
            Agora — porque cada mês sem controle é um mês que não volta.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary text-base px-8 py-3"
          >
            Quero começar agora &rarr;
          </button>
          <p className="text-stone-400 text-xs mt-3">
            Gratuito para começar — sem cartão de crédito
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 text-center">
        <p className="text-stone-400 text-sm">
          Celeiro — Gestão financeira pessoal
        </p>
      </footer>
    </div>
  );
}
