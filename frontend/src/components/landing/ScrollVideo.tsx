import { useRef, useEffect, useCallback, useState, forwardRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { HeroComposition, TOTAL_FRAMES } from './HeroComposition';
import { navigate } from '../../utils/navigation';

const COMPOSITION_FPS = 30;

export const ScrollVideo = forwardRef<HTMLDivElement>(function ScrollVideo(_props, ref) {
  const playerRef = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    const update = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      const player = playerRef.current;
      if (!container || !player) return;

      const rect = container.getBoundingClientRect();
      const scrollRoom = container.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollRoom));
      // Offset so Chapter 1 is already visible when container enters view
      const INITIAL_FRAME = 25;
      const frame = Math.round(INITIAL_FRAME + progress * (TOTAL_FRAMES - 1 - INITIAL_FRAME));

      player.seekTo(frame);
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  useEffect(() => {
    playerRef.current?.pause();
  }, []);

  // Shorter container = faster scroll pacing; initial frame offset ensures Ch1 is visible on entry
  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      style={{ height: '380vh', position: 'relative' }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <Player
          ref={playerRef}
          component={HeroComposition}
          compositionWidth={dimensions.width}
          compositionHeight={dimensions.height}
          durationInFrames={TOTAL_FRAMES}
          fps={COMPOSITION_FPS}
          style={{ width: '100%', height: '100%' }}
          controls={false}
          autoPlay={false}
          inputProps={{}}
        />
        {/* Clickable CTA overlay — positioned over closing scene CTA */}
        <button
          onClick={() => navigate('/login')}
          style={{
            position: 'absolute',
            left: '50%',
            top: '58%',
            transform: 'translateX(-50%)',
            padding: '14px 36px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 17,
            color: 'transparent',
            borderRadius: 12,
            minWidth: 240,
            minHeight: 48,
          }}
          aria-label="Quero começar agora"
        >
          Quero começar agora
        </button>
      </div>
    </div>
  );
});
