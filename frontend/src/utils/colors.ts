/**
 * Harvest Design System - Color Utilities
 *
 * A muted, warm color palette that avoids visual chaos.
 * Categories use variations of stone/neutral tones for calm differentiation.
 */

// Muted category palette - 6 warm neutral variations that work together
// These replace the previous 15-color rainbow to reduce visual noise
export const CATEGORY_COLORS = [
  '#8E7B6D', // Warm taupe
  '#7A8B68', // Sage (from design system)
  '#A08B76', // Sandstone
  '#6B7F8A', // Cool slate
  '#8B7B6B', // Clay
  '#7B8B7F', // Moss
];

// Extended palette for when more than 6 categories are needed
// Still muted but with slight variation
export const CATEGORY_COLORS_EXTENDED = [
  ...CATEGORY_COLORS,
  '#9A8B7D', // Light taupe
  '#6F8378', // Deep sage
  '#B09A86', // Wheat tan
  '#7D8A94', // Storm blue
  '#998978', // Adobe
  '#8A9A8E', // Pale moss
];

// Semantic colors from the Harvest palette (Tailwind values)
export const SEMANTIC_COLORS = {
  // Primary - Wheat tones
  wheat: {
    light: '#FEF3C7',   // wheat-100
    main: '#F59E0B',    // wheat-500
    dark: '#D97706',    // wheat-600
  },
  // Success - Sage tones
  sage: {
    light: '#E8EBE4',   // sage-100
    main: '#7A8B68',    // sage-500
    dark: '#5F6E50',    // sage-600
  },
  // Warning - Terra tones
  terra: {
    light: '#FBEAE3',   // terra-100
    main: '#DF7246',    // terra-500
    dark: '#D15A32',    // terra-600
  },
  // Error - Rust tones
  rust: {
    light: '#FCE8E6',   // rust-100
    main: '#E16254',    // rust-500
    dark: '#CC4536',    // rust-600
  },
  // Neutral - Stone tones
  stone: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },
};

/**
 * Get budget status color based on percentage spent
 * Under 80%: Sage (on track)
 * 80-100%: Terra (warning)
 * Over 100%: Rust (over budget)
 */
export function getBudgetStatusColor(percentSpent: number): {
  bg: string;
  text: string;
  indicator: string;
  label: string;
} {
  if (percentSpent > 100) {
    return {
      bg: 'bg-rust-100',
      text: 'text-rust-700',
      indicator: '✗',
      label: 'Acima do limite',
    };
  }
  if (percentSpent >= 80) {
    return {
      bg: 'bg-terra-100',
      text: 'text-terra-700',
      indicator: '⚠',
      label: 'Atenção',
    };
  }
  return {
    bg: 'bg-sage-100',
    text: 'text-sage-700',
    indicator: '✓',
    label: 'No caminho',
  };
}

/**
 * Get color style for category badge/icon
 * Uses the muted palette with proper opacity values
 */
export function getCategoryColorStyle(color: string) {
  // Convert hex to RGB for background opacity
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return {
    bg: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    },
    border: {
      borderColor: `rgba(${r}, ${g}, ${b}, 0.25)`,
    },
    accent: {
      backgroundColor: color,
    },
    text: {
      color: color,
    },
    hover: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.18)`,
    },
  };
}

/**
 * Get a deterministic color from the category palette based on category ID or index
 */
export function getCategoryColor(indexOrId: number | string): string {
  let index: number;

  if (typeof indexOrId === 'string') {
    // Hash the string to get a consistent number
    let hash = 0;
    for (let i = 0; i < indexOrId.length; i++) {
      const char = indexOrId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    index = Math.abs(hash);
  } else {
    index = indexOrId;
  }

  return CATEGORY_COLORS_EXTENDED[index % CATEGORY_COLORS_EXTENDED.length];
}

/**
 * Progress bar color classes based on percentage
 */
export function getProgressBarClasses(percentSpent: number): string {
  if (percentSpent > 100) {
    return 'bg-rust-500';
  }
  if (percentSpent >= 80) {
    return 'bg-terra-500';
  }
  return 'bg-sage-500';
}

/**
 * Status indicator with icon and color
 */
export function getStatusIndicator(percentSpent: number): {
  icon: string;
  colorClass: string;
  bgClass: string;
} {
  if (percentSpent > 100) {
    return {
      icon: '✗',
      colorClass: 'text-rust-600',
      bgClass: 'bg-rust-100',
    };
  }
  if (percentSpent >= 85) {
    return {
      icon: '⚠',
      colorClass: 'text-terra-600',
      bgClass: 'bg-terra-100',
    };
  }
  return {
    icon: '✓',
    colorClass: 'text-sage-600',
    bgClass: 'bg-sage-100',
  };
}
