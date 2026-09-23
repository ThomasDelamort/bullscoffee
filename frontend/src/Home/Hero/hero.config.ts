/**
 * Bull's Coffee hero: everything tunable about the section lives here.
 *
 * Images: drop files into ./assets using the file names referenced below.
 * Any file that isn't there yet renders as a labeled placeholder, so the
 * layout holds before the real art arrives.
 */

export type HexColor = `#${string}`;
export type HeroAssetFile = `${string}.${'png' | 'webp' | 'avif' | 'jpg' | 'jpeg' | 'svg'}`;

export interface HeroFlavor {
  /** Stable React key. */
  id: string;
  /** Used as the cup's alt text. */
  name: string;
  /** Section background while this flavor is center stage. */
  background: HexColor;
  /** Cup product shot, file name inside ./assets. */
  cup: HeroAssetFile;
}

/**
 * Rotation order; loops back to the first entry after the last.
 * Adding or reordering a flavor is a one-line change here.
 */
export const HERO_FLAVORS: readonly [HeroFlavor, ...HeroFlavor[]] = [
  { id: 'strawberry', name: 'Strawberry frappé', background: '#E2C7B8', cup: 'cup-1.png' },
  { id: 'mocha', name: 'Mocha frappé', background: '#5D3A20', cup: 'cup-2.png' },
  { id: 'matcha', name: 'Matcha frappé', background: '#C9D8A7', cup: 'cup-3.png' },
  { id: 'java-chip', name: 'Java chip frappé', background: '#2B3A4A', cup: 'cup-4.png' },
  { id: 'mango', name: 'Mango frappé', background: '#EEDAA2', cup: 'cup-5.png' },
];

/** How long each flavor holds center stage, transition included. */
export const CYCLE_INTERVAL_MS = 3500;
/** Wheel rotation and background tween duration. Keep it below CYCLE_INTERVAL_MS. */
export const TRANSITION_MS = 1200;
export const TRANSITION_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** Width / height of the cup images; reserves their layout box. */
export const CUP_ASPECT_RATIO = 5 / 9;

export const LOGO_MARK: HeroAssetFile = 'logo-mark.png';
/** Bean cut-outs; list several to vary them (see BeanPlacement.variant). */
export const BEAN_IMAGES: readonly [HeroAssetFile, ...HeroAssetFile[]] = ['bean.png'];

export const BRAND_GOLD: HexColor = '#E8A33C';
/** The hill at the bottom of the hero; match it to the next section's background. */
export const HILL_COLOR: HexColor = '#D9D9D9';

export const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Menu', href: '#menu' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
] as const;

export type NavHref = (typeof NAV_LINKS)[number]['href'];

export interface BeanPlacement {
  /** Offset of the bean's center from the cup's center, in cup heights. */
  x: number;
  y: number;
  /** Bean width, in cup heights. */
  size: number;
  /** Resting angle, in degrees. */
  rotate: number;
  /** Tucked behind the cup or floating in front of it. */
  layer: 'back' | 'front';
  /** Depth-of-field blur, in px. */
  blur?: number;
  /** Index into BEAN_IMAGES (wraps around). */
  variant?: number;
}

/** Bean field around the center cup, traced from the reference layout. */
export const BEANS: readonly BeanPlacement[] = [
  { x: -0.5, y: -0.45, size: 0.17, rotate: -55, layer: 'front' },
  { x: -0.31, y: -0.29, size: 0.16, rotate: -25, layer: 'front' },
  { x: -0.16, y: -0.36, size: 0.09, rotate: 15, layer: 'back', blur: 0.5 },
  { x: 0.07, y: -0.38, size: 0.09, rotate: -40, layer: 'back', blur: 0.5 },
  { x: 0.21, y: -0.27, size: 0.1, rotate: 20, layer: 'back' },
  { x: 0.44, y: -0.3, size: 0.18, rotate: -30, layer: 'front' },
  { x: -0.43, y: -0.09, size: 0.16, rotate: 30, layer: 'front' },
  { x: -0.26, y: 0.07, size: 0.1, rotate: -20, layer: 'back' },
  { x: -0.3, y: 0.22, size: 0.12, rotate: 65, layer: 'front' },
  { x: 0.37, y: 0.18, size: 0.16, rotate: 35, layer: 'front' },
  { x: -0.36, y: 0.01, size: 0.035, rotate: 10, layer: 'back', blur: 1.5 },
  { x: -0.38, y: 0.19, size: 0.035, rotate: -30, layer: 'front', blur: 1.5 },
  { x: -0.17, y: 0.31, size: 0.03, rotate: 45, layer: 'front', blur: 2 },
];
