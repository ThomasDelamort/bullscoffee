import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { Category, Customer, Discount, Employee, Product } from "../types";
import { posKeys } from "./keys";

/** The register stays on one screen all shift, so it polls for price and stock changes. */
const MENU_REFRESH_MS = 60_000;

// pg sends DECIMAL columns as strings ("120.00").
const toProduct = (p: Product): Product => ({ ...p, price: Number(p.price), has_sizes: Boolean(p.has_sizes) });
const toDiscount = (d: Discount): Discount => ({ ...d, value: Number(d.value) });
// In the order the manager added them, which is how they planned the menu.
const byId = <T>(id: (row: T) => number) => (a: T, b: T) => id(a) - id(b);

/** The signed-in user's employee record; 403 when they aren't staff. */
export function useCurrentEmployee({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: posKeys.me,
    queryFn: () => api.get<Employee>("/manager/me"),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useCategories() {
  const api = useApi();
  return useQuery({
    queryKey: posKeys.categories,
    queryFn: async () => (await api.get<Category[]>("/categories")).sort(byId((c) => c.category_id)),
    refetchInterval: MENU_REFRESH_MS,
  });
}

export function useProducts() {
  const api = useApi();
  return useQuery({
    queryKey: posKeys.products,
    queryFn: async () => (await api.get<Product[]>("/products")).map(toProduct).sort(byId((p) => p.product_id)),
    refetchInterval: MENU_REFRESH_MS,
  });
}

/** Active presets only: a switched-off discount can't be rung up. */
export function useDiscounts() {
  const api = useApi();
  return useQuery({
    queryKey: posKeys.discounts,
    queryFn: async () => (await api.get<Discount[]>("/discounts")).map(toDiscount),
    select: (rows) => rows.filter((d) => d.is_active),
  });
}

/** Shorter terms match too much of the table to be useful. */
export const MIN_CUSTOMER_SEARCH = 2;

/** The backend caps results at 20. Pass a debounced term. */
export function useCustomerSearch(term: string) {
  const api = useApi();
  const search = term.trim();
  return useQuery({
    queryKey: posKeys.customerSearch(search.toLowerCase()),
    queryFn: () => api.get<Customer[]>("/customers/search", { search }),
    enabled: search.length >= MIN_CUSTOMER_SEARCH,
    staleTime: 60_000,
  });
}
