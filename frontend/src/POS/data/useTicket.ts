import { useCallback, useRef, useState } from "react";
import type { ItemSize, Product } from "../types";
import { unitPrice } from "../utils/pricing";

/** One line on the walk-in ticket being rung up. */
export interface TicketLine {
  key: number;
  product: Product;
  size: ItemSize | null;
  quantity: number;
  note: string;
}

export interface Ticket {
  lines: (TicketLine & { price: number })[];
  /** Units of a product across all its lines, for the badge on its menu card. */
  countOf: (productId: number) => number;
  add: (product: Product) => void;
  patch: (key: number, change: Partial<Omit<TicketLine, "key" | "product">>) => void;
  remove: (key: number) => void;
  clear: () => void;
}

export function useTicket(): Ticket {
  const [lines, setLines] = useState<TicketLine[]>([]);
  const nextKey = useRef(1);

  const add = useCallback((product: Product) => {
    const size: ItemSize | null = product.has_sizes ? "tall" : null;
    // Taken outside the updater, which StrictMode runs twice.
    const key = nextKey.current++;
    setLines((current) => {
      // Tapping a product again bumps its plain line rather than adding a duplicate.
      const same = current.find((l) => l.product.product_id === product.product_id && l.size === size && !l.note);
      if (same) return current.map((l) => (l === same ? { ...l, quantity: l.quantity + 1 } : l));
      return [...current, { key, product, size, quantity: 1, note: "" }];
    });
  }, []);

  const patch = useCallback<Ticket["patch"]>((key, change) => {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...change } : l)));
  }, []);

  const remove = useCallback((key: number) => setLines((current) => current.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  return {
    lines: lines.map((l) => ({ ...l, price: unitPrice(l.product, l.size) })),
    countOf: (productId) =>
      lines.filter((l) => l.product.product_id === productId).reduce((sum, l) => sum + l.quantity, 0),
    add,
    patch,
    remove,
    clear,
  };
}
