import type { ReactNode } from 'react';
import { useVideoConfig } from 'remotion';

interface SplitLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

/**
 * Chapter split layout: text on left (45%), screen mockup on right (55%).
 * Stacks vertically when composition width < 700.
 */
export function SplitLayout({ left, right }: SplitLayoutProps) {
  const { width } = useVideoConfig();
  const isMobile = width < 700;

  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '40px 20px',
          gap: 24,
          justifyContent: 'center',
        }}
      >
        <div style={{ flex: '0 0 auto' }}>{left}</div>
        <div style={{ flex: 1, minHeight: 0 }}>{right}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        padding: '40px 60px',
        gap: 40,
      }}
    >
      <div
        style={{
          flex: '0 0 42%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {left}
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        {right}
      </div>
    </div>
  );
}
