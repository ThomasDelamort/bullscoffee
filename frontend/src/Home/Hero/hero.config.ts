/**
 * Bull's Coffee hero: everything tunable about the section lives here.
 *
 * Images: drop files into ./assets using the file names referenced below.
 * Any file that isn't there yet renders as a labeled placeholder, so the
 * layout holds before the real art arrives.
 */

export type HexColor = `#${string}`;
export type HeroAssetFile =
  `${string}.${"png" | "webp" | "avif" | "jpg" | "jpeg" | "svg"}`;

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
  {
    id: "strawberry",
    name: "Strawberry frappé",
    background: "#E2C7B8",
    cup: "cup-1.png",
  },
  {
    id: "mocha",
    name: "Mocha frappé",
    background: "#5D3A20",
    cup: "cup-2.png",
  },
  {
    id: "matcha",
    name: "Matcha frappé",
    background: "#C9D8A7",
    cup: "cup-3.png",
  },
  {
    id: "java-chip",
    name: "Java chip frappé",
    background: "#2B3A4A",
    cup: "cup-4.png",
  },
  {
    id: "mango",
    name: "Mango frappé",
    background: "#EEDAA2",
    cup: "cup-5.png",
  },
];

/** How long each flavor holds center stage, transition included. */
export const CYCLE_INTERVAL_MS = 3500;
/** Wheel rotation and background tween duration. Keep it below CYCLE_INTERVAL_MS. */
export const TRANSITION_MS = 1200;
export const TRANSITION_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Cup image framing. The PNGs are square with transparent padding around the
 * cup: CUP_FILL is the share of the image height the cup itself occupies, and
 * each image is trimmed to CUP_BOX_ASPECT (width / height) to drop the empty
 * sides. Re-measure CUP_FILL if the product shots are re-exported.
 */
export const CUP_FILL = 0.66;
export const CUP_BOX_ASPECT = 1 / 2;

export const LOGO_MARK: HeroAssetFile = "logo-mark.png";

export const BRAND_GOLD: HexColor = "#E8A33C";
/** The hill at the bottom of the hero; match it to the next section's background. */
export const HILL_COLOR: HexColor = "#D9D9D9";

export const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Menu", href: "#menu" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

export type NavHref = (typeof NAV_LINKS)[number]["href"];

/**
 * Bean cluster floating behind the center cup: one composed image, centered
 * on the cup. Sizes and offsets are in cup heights.
 */
export const BEAN_FIELD = {
  file: "beans.png",
  /** Image width; the beans themselves span ~76% of it. */
  size: 1.32,
  x: 0,
  y: -0.08,
} as const satisfies { file: HeroAssetFile; size: number; x: number; y: number };
