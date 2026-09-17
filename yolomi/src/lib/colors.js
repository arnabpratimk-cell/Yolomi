// Fixed, stable palette so class colors don't shift between sessions.
// Chosen for contrast against the dark canvas and against each other.
export const CLASS_PALETTE = [
  '#5b8def', // blue
  '#f5b84c', // amber
  '#3dd68c', // green
  '#f0605b', // red
  '#c792ea', // violet
  '#4dd0e1', // cyan
  '#ff8a65', // coral
  '#aed581', // lime
  '#f06292', // pink
  '#9fa8da', // periwinkle
  '#ffd54f', // gold
  '#4db6ac', // teal
];

export function colorForIndex(index) {
  return CLASS_PALETTE[index % CLASS_PALETTE.length];
}

// Hex -> "r, g, b" for use in rgba() fills
export function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}
