import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { SplitLayout } from '../shared/SplitLayout';
import { BrowserFrame } from '../shared/BrowserFrame';
import { SceneTransition } from '../shared/SceneTransition';
import { ProgressBar } from '../shared/ProgressBar';
import { AnimatedNumber } from '../shared/AnimatedNumber';

const GOALS = [
  {
    emoji: '🛡️',
    label: 'Reserva de emergência',
    current: 20400,
    target: 30000,
    progress: 0.68,
  },
  {
    emoji: '⛪',
    label: 'Dízimo e ofertas',
    current: 820,
    target: 820,
    progress: 1.0,
    completed: true,
  },
  {
    emoji: '✈️',
    label: 'Viagem em família',
    current: 2250,
    target: 5000,
    progress: 0.45,
  },
];

/** Chapter 4: savings goals with animated progress and "Concluído" badge */
export function Chapter4Generosity() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const completedScale = spring({
    frame: frame - 40,
    fps,
    config: { damping: 10, stiffness: 150 },
  });
  const completedOpacity = interpolate(frame, [38, 43], [0, 1], {
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
                    fontSize: 26,
                    fontWeight: 700,
                    color: '#3D2B1F',
                    lineHeight: 1.35,
                    fontStyle: 'italic',
                    margin: 0,
                  }}
                >
                  "Dar com liberdade — porque quem conhece seus números doa sem culpa e sem medo."
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: '#6B5744',
                    lineHeight: 1.6,
                    margin: 0,
                    paddingTop: 16,
                  }}
                >
                  Dar apenas o que sobra não é generosidade.
                  <br />
                  É descuido com o que foi confiado a você.
                </p>
              </div>
            </SceneTransition>
          }
          right={
            <SceneTransition startFrame={8} endFrame={55} direction="right" fadeInDuration={10} fadeOutDuration={12}>
              <BrowserFrame>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {GOALS.map((goal, i) => {
                    const cardDelay = 12 + i * 8;
                    const cardSpring = spring({
                      frame: frame - cardDelay,
                      fps,
                      config: { damping: 12, stiffness: 100 },
                    });
                    const cardOpacity = interpolate(frame, [cardDelay, cardDelay + 6], [0, 1], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    });

                    return (
                      <div
                        key={i}
                        style={{
                          opacity: cardOpacity,
                          transform: `translateY(${(1 - cardSpring) * 20}px)`,
                          padding: '10px 12px',
                          background: '#FFFDF8',
                          border: '1px solid rgba(61,43,31,0.08)',
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#3D2B1F' }}>
                            {goal.emoji} {goal.label}
                          </span>
                          {goal.completed && (
                            <span
                              style={{
                                opacity: completedOpacity,
                                transform: `scale(${Math.min(completedScale, 1)})`,
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: 'rgba(90,138,74,0.15)',
                                fontSize: 9,
                                fontWeight: 700,
                                color: '#5A8A4A',
                              }}
                            >
                              Concluído ✓
                            </span>
                          )}
                        </div>
                        <ProgressBar
                          startFrame={cardDelay + 5}
                          duration={18}
                          progress={goal.progress}
                          color={goal.completed ? '#5A8A4A' : '#C6943A'}
                          height={8}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#6B5744' }}>
                          <AnimatedNumber
                            startFrame={cardDelay + 5}
                            duration={18}
                            to={goal.current}
                            style={{ fontWeight: 600 }}
                          />
                          <span>/ R$&nbsp;{goal.target.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </BrowserFrame>
            </SceneTransition>
          }
        />
      </SceneTransition>
    </AbsoluteFill>
  );
}
