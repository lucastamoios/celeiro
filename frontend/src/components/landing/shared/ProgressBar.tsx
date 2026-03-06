import { useCurrentFrame, interpolate } from 'remotion';

interface ProgressBarProps {
  startFrame: number;
  duration?: number;
  progress: number; // 0–1
  color?: string;
  trackColor?: string;
  height?: number;
}

/**
 * Animated fill bar. Progress animates from 0 to target value.
 */
export function ProgressBar({
  startFrame,
  duration = 30,
  progress,
  color = '#5A8A4A',
  trackColor = '#E8E1D5',
  height = 10,
}: ProgressBarProps) {
  const frame = useCurrentFrame();

  const fill = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, progress],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: height / 2,
        background: trackColor,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${fill * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          background: color,
          transition: 'none',
        }}
      />
    </div>
  );
}
