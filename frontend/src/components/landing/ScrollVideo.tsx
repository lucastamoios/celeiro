import { useRef, useEffect, useCallback, useState, forwardRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { HeroComposition, TOTAL_FRAMES } from './HeroComposition';
import { navigate } from '../../utils/navigation';

const COMPOSITION_FPS = 30;
const FRAME_DURATION = 1000 / COMPOSITION_FPS; // ~33ms per frame

/**
 * Scroll-triggered autoplay with auto-advance.
 *
 * Scrolling into the section triggers zone 0. When a zone's animation
 * finishes, the page auto-scrolls to the next zone's threshold, creating
 * a continuous chain: Ch1 → Ch2 → Ch3 → Ch4 → Closing → scroll past.
 *
 * The user can also scroll manually to skip ahead or go back.
 */
const ZONES = [
  { threshold: 0.0,  startFrame: 0,   endFrame: 54  },  // Ch1
  { threshold: 0.2,  startFrame: 40,  endFrame: 109 },  // Ch2
  { threshold: 0.4,  startFrame: 95,  endFrame: 164 },  // Ch3
  { threshold: 0.6,  startFrame: 150, endFrame: 219 },  // Ch4
  { threshold: 0.8,  startFrame: 205, endFrame: 279 },  // Closing
];

// Pause between chapters before auto-scrolling to next (ms)
const CHAPTER_PAUSE = 400;

export const ScrollVideo = forwardRef<HTMLDivElement>(function ScrollVideo(_props, ref) {
  const playerRef = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  // Animation state (refs to avoid re-renders)
  const currentFrameRef = useRef(0);
  const targetFrameRef = useRef(54);
  const animatingRef = useRef(false);
  const lastTimeRef = useRef(0);
  const activeZoneRef = useRef(0);
  const autoAdvancingRef = useRef(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const update = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Scroll the page so that progress reaches a given threshold
  const scrollToProgress = useCallback((targetProgress: number) => {
    const container = containerRef.current;
    if (!container) return;

    const scrollRoom = container.offsetHeight - window.innerHeight;
    const containerTop = container.getBoundingClientRect().top + window.scrollY;
    const targetScroll = containerTop + targetProgress * scrollRoom;

    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, []);

  // When a zone's animation completes, auto-advance to next zone
  const onZoneComplete = useCallback((completedZone: number) => {
    const nextZone = completedZone + 1;

    if (nextZone < ZONES.length) {
      // Brief pause, then scroll to trigger the next zone
      autoAdvancingRef.current = true;
      pauseTimerRef.current = setTimeout(() => {
        // Add a small offset past the threshold so it reliably triggers
        scrollToProgress(ZONES[nextZone].threshold + 0.05);
      }, CHAPTER_PAUSE);
    } else {
      // Last zone finished — scroll past the container
      autoAdvancingRef.current = true;
      pauseTimerRef.current = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        const containerBottom = container.getBoundingClientRect().top + window.scrollY + container.offsetHeight;
        window.scrollTo({ top: containerBottom, behavior: 'smooth' });
        // Reset auto-advancing after scroll completes
        setTimeout(() => { autoAdvancingRef.current = false; }, 800);
      }, CHAPTER_PAUSE);
    }
  }, [scrollToProgress]);

  // Animation loop: advances frames at 30fps toward targetFrame
  const animate = useCallback((timestamp: number) => {
    if (!animatingRef.current) return;

    const elapsed = timestamp - lastTimeRef.current;
    if (elapsed >= FRAME_DURATION) {
      lastTimeRef.current = timestamp - (elapsed % FRAME_DURATION);

      const current = currentFrameRef.current;
      const target = targetFrameRef.current;

      if (current !== target) {
        const next = current < target ? current + 1 : current - 1;
        currentFrameRef.current = next;
        playerRef.current?.seekTo(next);
      }

      if (currentFrameRef.current === targetFrameRef.current) {
        animatingRef.current = false;
        // Notify that this zone's animation is complete (forward only)
        if (current < target || current === target) {
          onZoneComplete(activeZoneRef.current);
        }
        return;
      }
    }

    requestAnimationFrame(animate);
  }, [onZoneComplete]);

  const startAnimation = useCallback((targetFrame: number) => {
    targetFrameRef.current = targetFrame;

    if (!animatingRef.current) {
      animatingRef.current = true;
      lastTimeRef.current = performance.now();
      requestAnimationFrame(animate);
    }
  }, [animate]);

  // Scroll handler: determines which zone we're in
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scrollRoom = container.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / scrollRoom));

    // Find the active zone
    let zoneIndex = 0;
    for (let i = ZONES.length - 1; i >= 0; i--) {
      if (progress >= ZONES[i].threshold) {
        zoneIndex = i;
        break;
      }
    }

    // Only trigger when zone changes
    if (zoneIndex !== activeZoneRef.current) {
      // If user manually scrolled (not auto-advancing), cancel any pending auto-advance
      if (!autoAdvancingRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
      autoAdvancingRef.current = false;

      activeZoneRef.current = zoneIndex;
      const zone = ZONES[zoneIndex];

      const goingForward = zone.endFrame > currentFrameRef.current;
      startAnimation(goingForward ? zone.endFrame : zone.startFrame);
    }
  }, [startAnimation]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(pauseTimerRef.current);
    };
  }, [handleScroll]);

  // Start at frame 15 so Ch1 is already visible
  useEffect(() => {
    playerRef.current?.pause();
    playerRef.current?.seekTo(15);
    currentFrameRef.current = 15;
  }, []);

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      style={{ height: '350vh', position: 'relative' }}
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
