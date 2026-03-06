import { AbsoluteFill, Sequence } from 'remotion';
import { Chapter1Problem } from './scenes/Chapter1Problem';
import { Chapter2Vision } from './scenes/Chapter2Vision';
import { Chapter3Marriage } from './scenes/Chapter3Marriage';
import { Chapter4Generosity } from './scenes/Chapter4Generosity';
import { ChapterClosing } from './scenes/ChapterClosing';

/**
 * Frame map:
 *   0–110   Chapter 1: O problema (messy transactions)
 * 110–220   Chapter 2: A visão (organized + categories)
 * 220–330   Chapter 3: O casamento (dashboard pacing)
 * 330–440   Chapter 4: A generosidade (savings goals)
 * 440–520   Closing (tagline + CTA)
 */
export const TOTAL_FRAMES = 520;

export function HeroComposition() {
  return (
    <AbsoluteFill style={{ background: '#F6F1E9' }}>
      <Sequence from={0} durationInFrames={110}>
        <Chapter1Problem />
      </Sequence>

      <Sequence from={110} durationInFrames={110}>
        <Chapter2Vision />
      </Sequence>

      <Sequence from={220} durationInFrames={110}>
        <Chapter3Marriage />
      </Sequence>

      <Sequence from={330} durationInFrames={110}>
        <Chapter4Generosity />
      </Sequence>

      <Sequence from={440} durationInFrames={80}>
        <ChapterClosing />
      </Sequence>
    </AbsoluteFill>
  );
}
