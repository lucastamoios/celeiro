import { useRef, useEffect, useState, forwardRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { HeroComposition, TOTAL_FRAMES } from './HeroComposition';
import { navigate } from '../../utils/navigation';

const COMPOSITION_FPS = 30;
const FRAME_DURATION = 1000 / COMPOSITION_FPS;

/**
 * Scroll-triggered autoplay.
 *
 * When the container enters the viewport, the animation plays from
 * start to finish at 30fps. When complete, the page scrolls past
 * the section. The user can still scroll away manually at any time.
 */
export const ScrollVideo = forwardRef<HTMLDivElement>(function ScrollVideo(_props, ref) {
  const playerRef = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  const currentFrameRef = useRef(0);
  const animatingRef = useRef(false);
  const startedRef = useRef(false);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const update = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const scrollPastContainer = () => {
    const container = containerRef.current;
    if (!container) return;
    const bottom = container.getBoundingClientRect().top + window.scrollY + container.offsetHeight;
    window.scrollTo({ top: bottom, behavior: 'smooth' });
  };

  const animate = (timestamp: number) => {
    if (!animatingRef.current) return;

    const elapsed = timestamp - lastTimeRef.current;
    if (elapsed >= FRAME_DURATION) {
      lastTimeRef.current = timestamp - (elapsed % FRAME_DURATION);

      const next = currentFrameRef.current + 1;
      if (next >= TOTAL_FRAMES) {
        // Animation complete — scroll past
        animatingRef.current = false;
        setTimeout(scrollPastContainer, 600);
        return;
      }

      currentFrameRef.current = next;
      playerRef.current?.seekTo(next);
    }

    requestAnimationFrame(animate);
  };

  const startPlayback = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    animatingRef.current = true;
    lastTimeRef.current = performance.now();
    requestAnimationFrame(animate);
  };

  // Trigger playback when container enters viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startPlayback();
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Start paused at frame 0
  useEffect(() => {
    playerRef.current?.pause();
    playerRef.current?.seekTo(0);
  }, []);

  // Container just needs enough height to keep the sticky visible during playback
  // 280 frames at 30fps ≈ 9.3s of animation. At typical scroll speed, 200vh is plenty.
  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      style={{ height: '200vh', position: 'relative' }}
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
