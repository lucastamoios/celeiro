import { useCurrentFrame, interpolate } from 'remotion';

interface AnimatedNumberProps {
  startFrame: number;
  duration?: number;
  from?: number;
  to: number;
  prefix?: string;
  style?: React.CSSProperties;
}

/**
 * Interpolates a number between `from` and `to` over a frame range.
 * Formats as Brazilian currency by default (R$ X.XXX,XX).
 */
export function AnimatedNumber({
  startFrame,
  duration = 30,
  from = 0,
  to,
  prefix = 'R$\u00A0',
  style,
}: AnimatedNumberProps) {
  const frame = useCurrentFrame();

  const value = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [from, to],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: value % 1 === 0 && to % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return (
    <span style={style}>
      {prefix}{formatted}
    </span>
  );
}
