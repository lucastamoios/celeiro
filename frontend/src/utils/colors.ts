// Paleta de cores consistente para categorias
export const CATEGORY_COLORS = [
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#EF4444', // Red
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#F472B6', // Fuchsia
  '#06B6D4', // Cyan
  '#A855F7', // Purple
  '#F59E0B', // Amber (repeat)
  '#3B82F6', // Blue (repeat)
];

export function getCategoryColorStyle(color: string) {
  // Convert hex to RGB for background opacity
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  return {
    bg: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
    },
    border: {
      borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
    },
    accent: {
      backgroundColor: color,
    },
    text: {
      color: color,
    },
    hover: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
    },
  };
}

