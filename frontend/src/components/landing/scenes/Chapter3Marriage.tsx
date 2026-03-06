import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { SplitLayout } from '../shared/SplitLayout';
import { BrowserFrame } from '../shared/BrowserFrame';
import { SceneTransition } from '../shared/SceneTransition';
import { ProgressBar } from '../shared/ProgressBar';

const PACING_ITEMS = [
  { label: '🛒 Alimentação', spent: 1200, budget: 1800, progress: 0.67 },
  { label: '🚗 Transporte', spent: 380, budget: 600, progress: 0.63 },
  { label: '🎬 Lazer', spent: 150, budget: 400, progress: 0.38 },
];

/** Chapter 3: dashboard with budget pacing — everything under control */
export function Chapter3Marriage() {
  const frame = useCurrentFrame();

  const cardOpacity = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const badgeOpacity = interpolate(frame, [40, 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <SceneTransition startFrame={0} endFrame={70} fadeInDuration={12} fadeOutDuration={15} direction="up" slideDistance={30}>
        <SplitLayout
          left={
            <SceneTransition startFrame={5} endFrame={55} direction="left" fadeInDuration={10} fadeOutDuration={12}>
              <div style={{ padding: '0 8px' }}>
                <p
                  style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#3D2B1F',
                    lineHeight: 1.35,
                    fontStyle: 'italic',
                    margin: 0,
                  }}
                >
                  "Dinheiro deixa de ser motivo de tensão. Vira conversa."
                </p>
              </div>
            </SceneTransition>
          }
          right={
            <SceneTransition startFrame={8} endFrame={55} direction="right" fadeInDuration={10} fadeOutDuration={12}>
              <BrowserFrame>
                {/* Summary card */}
                <div
                  style={{
                    opacity: cardOpacity,
                    padding: '12px 14px',
                    background: '#FFFDF8',
                    border: '1px solid rgba(61,43,31,0.08)',
                    borderRadius: 10,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#3D2B1F', marginBottom: 10 }}>
                    Resumo Financeiro
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: '#6B5744' }}>Receitas</span>
                    <span style={{ color: '#5A8A4A', fontWeight: 600 }}>R$&nbsp;8.200</span>
                  </div>
                  <ProgressBar startFrame={15} duration={18} progress={1} color="#5A8A4A" height={8} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6, marginTop: 10 }}>
                    <span style={{ color: '#6B5744' }}>Despesas</span>
                    <span style={{ color: '#C4453A', fontWeight: 600 }}>R$&nbsp;6.430</span>
                  </div>
                  <ProgressBar startFrame={18} duration={18} progress={0.78} color="#D4722A" height={8} />
                </div>

                {/* Budget pacing rows */}
                {PACING_ITEMS.map((item, i) => {
                  const rowDelay = 22 + i * 6;
                  const rowOpacity = interpolate(
                    frame,
                    [rowDelay, rowDelay + 8],
                    [0, 1],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                  );

                  return (
                    <div key={i} style={{ opacity: rowOpacity, marginBottom: 10, padding: '0 2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: '#3D2B1F', fontWeight: 500 }}>{item.label}</span>
                        <span style={{ color: '#6B5744' }}>
                          R$&nbsp;{item.spent.toLocaleString('pt-BR')} / {item.budget.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <ProgressBar
                        startFrame={rowDelay + 3}
                        duration={15}
                        progress={item.progress}
                        color="#5A8A4A"
                        height={8}
                      />
                    </div>
                  );
                })}

                {/* Healthy status badge */}
                <div style={{ opacity: badgeOpacity, textAlign: 'center', marginTop: 8 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 999,
                      background: 'rgba(90,138,74,0.12)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#5A8A4A',
                    }}
                  >
                    ✅ Orçamento saudável
                  </span>
                </div>
              </BrowserFrame>
            </SceneTransition>
          }
        />
      </SceneTransition>
    </AbsoluteFill>
  );
}
