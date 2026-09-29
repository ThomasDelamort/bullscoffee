import { BRAND_GOLD, HILL_INK, INK_ON_DARK } from "./Hero/hero.config";

export const GOLD = BRAND_GOLD;
export const ESPRESSO = HILL_INK;
export const CREAM = INK_ON_DARK;

/** Foam that trails the coffee's surface as it pours in. */
export const CREMA = "#C89B6D";

/**
 * Espresso or cream, whichever reads better on a `#rrggbb` or `rgb(a)()`
 * color. Same rule as the hero palette: 0.179 luminance is where both
 * give equal contrast.
 */
export function inkOn(color: string): string {
  const channels = color.startsWith("#")
    ? [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16))
    : (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const [r, g, b] = channels.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? ESPRESSO : CREAM;
}
