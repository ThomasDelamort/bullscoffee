import { HERO_FLAVORS, type HeroFlavor } from "../../Home/Hero/hero.config";
import { CREMA } from "../../Home/theme";
import { CATEGORIES, PRODUCTS } from "../../POS/data/mock";
import type { Category, Product } from "../../POS/types";

/**
 * The kiosk sells exactly what the register sells: the same rows as the POS
 * mock. Swap for GET /api/categories and /api/products when the POS moves to the API.
 */
export const MENU_CATEGORIES: readonly Category[] = CATEGORIES;
export const MENU_PRODUCTS: readonly Product[] = PRODUCTS;

export function categoryOf(product: Pick<Product, "category_id">): Category | undefined {
  return MENU_CATEGORIES.find((c) => c.category_id === product.category_id);
}

export interface CategoryLook {
  /** Banner, tab chip and product-tile tint. */
  color: string;
  tagline: string;
}

const flavorColor = (id: HeroFlavor["id"]): string => HERO_FLAVORS.find((f) => f.id === id)?.background ?? CREMA;

/** Each category borrows one of the storefront's flavor colors. Keyed by category_name. */
const LOOKS: Record<string, CategoryLook> = {
  Espresso: { color: flavorColor("mocha"), tagline: "Bold shots and silky milk, pulled one cup at a time." },
  "Frappés": { color: flavorColor("strawberry"), tagline: "Blended thick and frosty, crowned with cream." },
  "Non-Coffee": { color: flavorColor("matcha"), tagline: "Matcha, chocolate and milk. No coffee needed." },
  Pastries: { color: flavorColor("mango"), tagline: "Baked every morning and warmed to order." },
  Snacks: { color: flavorColor("java-chip"), tagline: "Something to keep you going between classes." },
};

export function categoryLook(category: Pick<Category, "category_name"> | undefined): CategoryLook {
  return (category && LOOKS[category.category_name]) || { color: CREMA, tagline: "" };
}

/** The storefront's cup shot, for the signature frappés. Matched by name. */
export function cupFor(product: Pick<Product, "product_name">): HeroFlavor | undefined {
  const name = product.product_name.toLowerCase();
  return HERO_FLAVORS.find((f) => f.name.toLowerCase() === name);
}
