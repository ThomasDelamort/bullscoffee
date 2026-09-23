import type { HexColor } from './hero.config';

const INK_ON_LIGHT = '#2A1A10';
const INK_ON_DARK = '#FBF3E8';

export interface HeroPalette {
  /** Nav text, icons and placeholder outlines. */
  ink: string;
  /** Tiled "COFFEE" pattern: a tone of the background, lighter on every state. */
  watermark: string;
  /** Mobile menu panel. */
  surface: string;
}

type Rgb = [number, number, number];

function toRgb(hex: HexColor): Rgb {
  const digits = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1);
  const n = Number.parseInt(digits, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: Rgb): HexColor {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function mix(from: HexColor, to: HexColor, amount: number): HexColor {
  const a = toRgb(from);
  const b = toRgb(to);
  return toHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * amount) as Rgb);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(hex: HexColor): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Derives the per-state accent colors from the background, so a new flavor
 * only needs its background color. 0.179 is where black and white text have
 * equal contrast against the background.
 */
export function heroPalette(background: HexColor): HeroPalette {
  const isLight = luminance(background) > 0.179;
  return {
    ink: isLight ? INK_ON_LIGHT : INK_ON_DARK,
    watermark: mix(background, '#FFFFFF', isLight ? 0.3 : 0.07),
    surface: mix(background, isLight ? '#FFFFFF' : '#000000', 0.15),
  };
}
