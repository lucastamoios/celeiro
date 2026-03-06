import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img } from 'remotion';

/** Closing scene: tagline on dark wheat-field background + CTA */
export function ChapterClosing() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textOpacity = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textY = interpolate(frame, [8, 22], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ruleOpacity = interpolate(frame, [4, 14], [0, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ctaScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 10, stiffness: 120 },
  });
  const ctaOpacity = interpolate(frame, [30, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      {/* Wheat field background */}
      <AbsoluteFill>
        <Img
          src="/images/wheat-field.webp"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Dark overlay */}
      <AbsoluteFill style={{ background: 'rgba(28,25,23,0.75)' }} />

      {/* Content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px',
        }}
      >
        {/* Golden rule */}
        <div
          style={{
            width: 48,
            height: 2,
            backgroundColor: '#C6943A',
            marginBottom: 24,
            opacity: ruleOpacity,
            borderRadius: 1,
          }}
        />

        {/* Tagline */}
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 32,
            fontWeight: 700,
            fontStyle: 'italic',
            color: '#FAFAF9',
            textAlign: 'center',
            maxWidth: 600,
            lineHeight: 1.4,
            margin: 0,
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
          }}
        >
          Para quem foi chamado a prover, não apenas a ganhar.
        </p>

        {/* CTA button (visual only — real click handled by overlay in ScrollVideo) */}
        <div
          style={{
            marginTop: 36,
            opacity: ctaOpacity,
            transform: `scale(${Math.min(ctaScale, 1)})`,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '14px 36px',
              backgroundColor: '#C6943A',
              borderBottom: '2.5px solid #A67A2A',
              borderRadius: 12,
              color: '#FAFAF9',
              fontWeight: 600,
              fontSize: 17,
            }}
          >
            Quero começar agora →
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
