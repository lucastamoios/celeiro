import type { ReactNode } from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface SceneTransitionProps {
  children: ReactNode;
  startFrame: number;
  endFrame: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  direction?: 'left' | 'right' | 'up' | 'none';
  slideDistance?: number;
}

/**
 * Wraps content in opacity + translate animation.
 * Returns null when fully invisible to avoid rendering off-screen elements.
 */
export function SceneTransition({
  children,
  startFrame,
  endFrame,
  fadeInDuration = 20,
  fadeOutDuration = 15,
  direction = 'none',
  slideDistance = 40,
}: SceneTransitionProps) {
  const frame = useCurrentFrame();

  const fadeOutStart = endFrame - fadeOutDuration;

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + fadeInDuration, fadeOutStart, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  if (opacity <= 0) return null;

  let transform = '';
  if (direction === 'left') {
    const x = interpolate(
      frame,
      [startFrame, startFrame + fadeInDuration],
      [-slideDistance, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    transform = `translateX(${x}px)`;
  } else if (direction === 'right') {
    const x = interpolate(
      frame,
      [startFrame, startFrame + fadeInDuration],
      [slideDistance, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    transform = `translateX(${x}px)`;
  } else if (direction === 'up') {
    const y = interpolate(
      frame,
      [startFrame, startFrame + fadeInDuration],
      [slideDistance, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    transform = `translateY(${y}px)`;
  }

  return (
    <div style={{ opacity, transform, width: '100%', height: '100%' }}>
      {children}
    </div>
  );
}
