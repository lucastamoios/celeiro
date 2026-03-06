import { AbsoluteFill, Sequence } from 'remotion';
import { Chapter1Problem } from './scenes/Chapter1Problem';
import { Chapter2Vision } from './scenes/Chapter2Vision';
import { Chapter3Marriage } from './scenes/Chapter3Marriage';
import { Chapter4Generosity } from './scenes/Chapter4Generosity';
import { ChapterClosing } from './scenes/ChapterClosing';

/**
 * Frame map (overlapping sequences for crossfade):
 *   0–70   Chapter 1: O problema
 *  55–125  Chapter 2: A visão       (15-frame overlap with Ch1)
 * 110–180  Chapter 3: O casamento   (15-frame overlap with Ch2)
 * 165–235  Chapter 4: A generosidade (15-frame overlap with Ch3)
 * 220–280  Closing                   (15-frame overlap with Ch4)
 */
export const TOTAL_FRAMES = 280;

export function HeroComposition() {
  return (
    <AbsoluteFill style={{ background: '#F6F1E9' }}>
      <Sequence from={0} durationInFrames={70}>
        <Chapter1Problem />
      </Sequence>

      <Sequence from={55} durationInFrames={70}>
        <Chapter2Vision />
      </Sequence>

      <Sequence from={110} durationInFrames={70}>
        <Chapter3Marriage />
      </Sequence>

      <Sequence from={165} durationInFrames={70}>
        <Chapter4Generosity />
      </Sequence>

      <Sequence from={220} durationInFrames={60}>
        <ChapterClosing />
      </Sequence>
    </AbsoluteFill>
  );
}
