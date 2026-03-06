import type { ReactNode } from 'react';

interface BrowserFrameProps {
  children: ReactNode;
}

/**
 * Browser chrome mockup: dark top bar with traffic lights.
 * Content area uses the app's off-white background.
 */
export function BrowserFrame({ children }: BrowserFrameProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 520,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          background: '#2A2520',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FFBD2E', '#28C840'].map((color) => (
            <div
              key={color}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: color,
              }}
            />
          ))}
        </div>
      </div>
      {/* Content area */}
      <div
        style={{
          background: '#FFFDF8',
          padding: '16px 18px',
          minHeight: 280,
        }}
      >
        {children}
      </div>
    </div>
  );
}
