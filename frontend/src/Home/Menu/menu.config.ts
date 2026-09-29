import { HERO_FLAVORS, type HeroAssetFile, type HeroFlavor } from "../Hero/hero.config";

interface MenuCopy {
  tagline: string;
  description: string;
  /** Philippine pesos. */
  price: number;
  /** Ingredient splash behind the cup in the showcase, file name inside Hero/assets. */
  splash: HeroAssetFile;
}

/**
 * Showcase copy per hero flavor, keyed by flavor id. Cups, names and colors
 * come from HERO_FLAVORS, so the hero and the menu always show the same line-up.
 */
const COPY: Record<HeroFlavor["id"], MenuCopy> = {
  strawberry: {
    tagline: "Berry-bright & creamy",
    description: "Strawberry purée blended with milk and ice, crowned with whipped cream.",
    price: 165,
    splash: "strawbrerries.png",
  },
  mocha: {
    tagline: "Dark & indulgent",
    description: "Espresso and rich chocolate, finished with white chocolate curls.",
    price: 175,
    splash: "mochas.png",
  },
  matcha: {
    tagline: "Earthy & smooth",
    description: "Japanese matcha whisked with milk and blended over crushed ice.",
    price: 180,
    splash: "matchas.png",
  },
  "java-chip": {
    tagline: "Crunchy chocolate chips",
    description: "Coffee, mocha sauce and chocolate chips blended thick and frosty.",
    price: 185,
    splash: "javas.png",
  },
  mango: {
    tagline: "Sunny & tropical",
    description: "Sweet mangoes blended smooth into a bright, caffeine-free treat.",
    price: 170,
    splash: "mango.png",
  },
};

export type MenuItem = HeroFlavor & MenuCopy;

export const MENU_ITEMS: readonly MenuItem[] = HERO_FLAVORS.map((flavor) => ({
  ...flavor,
  ...COPY[flavor.id],
}));

export const formatPrice = (pesos: number) => `₱${pesos}`;
