import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { HERO_FLAVORS, type HeroFlavor } from "../../Home/Hero/hero.config";
import { CREMA } from "../../Home/theme";
import type { ApiClient } from "../../lib/api";
import { useApi } from "../../lib/apiContext";
import type { Category, Product } from "../../POS/types";

export const kioskKeys = {
  menu: ["kiosk", "menu"] as const,
  categories: ["kiosk", "menu", "categories"] as const,
  products: ["kiosk", "menu", "products"] as const,
};

/**
 * The kiosk sits on one screen all day and never refocuses, so it polls to
 * pick up price changes and items going in or out of stock.
 */
const MENU_REFRESH_MS = 60_000;

// pg sends DECIMAL columns as strings ("120.00").
const toProduct = (p: Product): Product => ({ ...p, price: Number(p.price), has_sizes: Boolean(p.has_sizes) });
// In the order the manager added them, which is how they planned the menu.
const byId = <T>(id: (row: T) => number) => (a: T, b: T) => id(a) - id(b);

const categoriesQuery = (api: ApiClient) =>
  queryOptions({
    queryKey: kioskKeys.categories,
    queryFn: async () => (await api.get<Category[]>("/categories")).sort(byId((c) => c.category_id)),
  });

const productsQuery = (api: ApiClient) =>
  queryOptions({
    queryKey: kioskKeys.products,
    queryFn: async () => (await api.get<Product[]>("/products")).map(toProduct).sort(byId((p) => p.product_id)),
  });

export type MenuState =
  | { status: "loading" }
  | { status: "error"; error: unknown; retry: () => void }
  | {
      status: "ready";
      /** Only categories with something in them; an empty tab is a dead end on a kiosk. */
      categories: Category[];
      /** Every category in `categories` has a non-empty list here. */
      productsByCategory: ReadonlyMap<number, Product[]>;
    };

/** The whole menu from GET /api/categories and /api/products, both public. */
export function useMenu(): MenuState {
  const api = useApi();
  const categories = useQuery({ ...categoriesQuery(api), refetchInterval: MENU_REFRESH_MS });
  const products = useQuery({ ...productsQuery(api), refetchInterval: MENU_REFRESH_MS });

  // Rebuilt only when a refresh actually changes the menu, not on every render.
  const ready = useMemo(() => {
    if (!categories.data || !products.data) return null;
    const productsByCategory = new Map<number, Product[]>();
    for (const p of products.data) {
      const list = productsByCategory.get(p.category_id);
      if (list) list.push(p);
      else productsByCategory.set(p.category_id, [p]);
    }
    return {
      status: "ready" as const,
      categories: categories.data.filter((c) => productsByCategory.has(c.category_id)),
      productsByCategory,
    };
  }, [categories.data, products.data]);

  // Once loaded, a failed background refresh keeps the last good menu on screen.
  if (ready) return ready;
  const error = categories.error ?? products.error;
  if (error) {
    return {
      status: "error",
      error,
      retry: () => {
        if (categories.isError) void categories.refetch();
        if (products.isError) void products.refetch();
      },
    };
  }
  return { status: "loading" };
}

/** The product's category, from the menu already in the cache. */
export function useCategoryOf(product: Pick<Product, "category_id">): Category | undefined {
  const api = useApi();
  const categoryId = product.category_id;
  const select = useCallback((rows: Category[]) => rows.find((c) => c.category_id === categoryId), [categoryId]);
  return useQuery({ ...categoriesQuery(api), select }).data;
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

/**
 * A category the manager names differently from the ones above still gets a
 * flavor color, picked by its id so it keeps the same one between visits.
 */
export function categoryLook(category: Pick<Category, "category_id" | "category_name"> | undefined): CategoryLook {
  if (!category) return { color: CREMA, tagline: "" };
  const flavor = HERO_FLAVORS[category.category_id % HERO_FLAVORS.length];
  return LOOKS[category.category_name] ?? { color: flavor?.background ?? CREMA, tagline: "" };
}

/** The storefront's cup shot, for the signature frappés. Matched by name. */
export function cupFor(product: Pick<Product, "product_name">): HeroFlavor | undefined {
  const name = product.product_name.toLowerCase();
  return HERO_FLAVORS.find((f) => f.name.toLowerCase() === name);
}
