interface CategoryPillProps {
  emoji: string;
  label: string;
  color: string;
}

/**
 * Colored rounded pill with emoji + label, used in transaction list mockups.
 */
export function CategoryPill({ emoji, label, color }: CategoryPillProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 999,
        background: color,
        fontSize: 10,
        fontWeight: 600,
        color: '#3D2B1F',
        whiteSpace: 'nowrap',
      }}
    >
      {emoji} {label}
    </span>
  );
}
