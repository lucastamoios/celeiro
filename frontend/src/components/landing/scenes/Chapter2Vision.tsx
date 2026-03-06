import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { SplitLayout } from '../shared/SplitLayout';
import { BrowserFrame } from '../shared/BrowserFrame';
import { SceneTransition } from '../shared/SceneTransition';
import { CategoryPill } from '../shared/CategoryPill';

const CATEGORIES = [
  { emoji: '🛒', label: 'Alimentação', color: 'rgba(90,138,74,0.15)' },
  { emoji: '🚗', label: 'Transporte', color: 'rgba(198,148,58,0.15)' },
  { emoji: '🎬', label: 'Lazer', color: 'rgba(212,114,42,0.15)' },
  { emoji: '🏠', label: 'Moradia', color: 'rgba(106,90,150,0.15)' },
  { emoji: '💳', label: 'Cartão', color: 'rgba(196,69,58,0.15)' },
  { emoji: '🏥', label: 'Saúde', color: 'rgba(74,130,170,0.15)' },
];

const TRANSACTIONS = [
  { date: '02/03', desc: 'PIX ENVIADO - JOSE DA SILVA', amount: -340.0, cat: 1 },
  { date: '28/02', desc: 'PAGTO CARTAO VISA', amount: -1287.45, cat: 4 },
  { date: '27/02', desc: 'DEB AUTOMATICO ENEL', amount: -189.9, cat: 3 },
  { date: '25/02', desc: 'TRANSF TED - MARIA S', amount: -520.0, cat: 5 },
  { date: '24/02', desc: 'COMPRA CARTAO - IFOOD', amount: -67.8, cat: 0 },
  { date: '22/02', desc: 'SAQUE ATM', amount: -200.0, cat: 2 },
];

/** Chapter 2: same transactions, now organized with category pills */
export function Chapter2Vision() {
  const frame = useCurrentFrame();

  // Badge "Classificação automática" fades in late
  const badgeOpacity = interpolate(frame, [65, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '#F6F1E9' }}>
      <SceneTransition startFrame={0} endFrame={110} fadeInDuration={20} fadeOutDuration={15}>
        <SplitLayout
          left={
            <SceneTransition startFrame={10} endFrame={95} direction="left" fadeOutDuration={15}>
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
                  "Com o Celeiro, você vê o mês antes que ele acabe."
                </p>
              </div>
            </SceneTransition>
          }
          right={
            <SceneTransition startFrame={20} endFrame={95} direction="right" fadeOutDuration={15}>
              <BrowserFrame>
                {/* Summary bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    marginBottom: 8,
                    background: 'rgba(90,138,74,0.08)',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: '#5A8A4A' }}>Receitas R$&nbsp;8.200</span>
                  <span style={{ color: '#C4453A' }}>Despesas R$&nbsp;6.430</span>
                  <span style={{ color: '#5A8A4A' }}>Saldo R$&nbsp;1.770</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {TRANSACTIONS.map((tx, i) => {
                    // Categories appear one by one, staggered
                    const catDelay = 30 + i * 6;
                    const catOpacity = interpolate(
                      frame,
                      [catDelay, catDelay + 10],
                      [0, 1],
                      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                    );
                    const cat = CATEGORIES[tx.cat];

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderBottom: '1px solid rgba(61,43,31,0.06)',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                          <span style={{ color: '#3D2B1F', fontWeight: 500, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.desc}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#8B7355', fontSize: 10 }}>{tx.date}</span>
                            <span style={{ opacity: catOpacity }}>
                              <CategoryPill emoji={cat.emoji} label={cat.label} color={cat.color} />
                            </span>
                          </div>
                        </div>
                        <span style={{ color: '#C4453A', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                          R$&nbsp;{Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Auto-classification badge */}
                <div
                  style={{
                    opacity: badgeOpacity,
                    marginTop: 10,
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 999,
                      background: 'rgba(198,148,58,0.12)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#A67A2A',
                    }}
                  >
                    ⚡ Classificação automática
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
