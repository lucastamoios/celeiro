import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { SplitLayout } from '../shared/SplitLayout';
import { BrowserFrame } from '../shared/BrowserFrame';
import { SceneTransition } from '../shared/SceneTransition';

const TRANSACTIONS = [
  { date: '02/03', desc: 'PIX ENVIADO - JOSE DA SILVA', amount: -340.0 },
  { date: '28/02', desc: 'PAGTO CARTAO VISA', amount: -1287.45 },
  { date: '27/02', desc: 'DEB AUTOMATICO ENEL', amount: -189.9 },
  { date: '25/02', desc: 'TRANSF TED - MARIA S', amount: -520.0 },
  { date: '24/02', desc: 'COMPRA CARTAO - IFOOD', amount: -67.8 },
  { date: '22/02', desc: 'SAQUE ATM', amount: -200.0 },
];

/** Chapter 1: messy transactions, no categories — visual chaos */
export function Chapter1Problem() {
  const frame = useCurrentFrame();

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
                  "O mês termina e você não sabe para onde foi."
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
                  Você não é irresponsável. Você só nunca teve uma ferramenta feita para quem carrega o peso que você carrega.
                </p>
              </div>
            </SceneTransition>
          }
          right={
            <SceneTransition startFrame={8} endFrame={55} direction="right" fadeInDuration={10} fadeOutDuration={12}>
              <BrowserFrame>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {TRANSACTIONS.map((tx, i) => {
                    const rowDelay = 8 + i * 3;
                    const rowOpacity = interpolate(
                      frame,
                      [rowDelay, rowDelay + 6],
                      [0, 1],
                      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                    );

                    return (
                      <div
                        key={i}
                        style={{
                          opacity: rowOpacity,
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
                            <span style={{ fontStyle: 'italic', color: '#8B7355', fontSize: 10 }}>
                              Sem categoria
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
              </BrowserFrame>
            </SceneTransition>
          }
        />
      </SceneTransition>
    </AbsoluteFill>
  );
}
