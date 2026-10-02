import { useCallback, useMemo, useRef, useState } from "react";
import type { ItemSize, Product } from "../../POS/types";
import { subtotalOf, unitPrice } from "../../POS/utils/pricing";

/** A sanity cap per line, so a stuck finger can't order 300 lattes. */
export const MAX_QUANTITY = 20;

export interface CartLine {
  key: number;
  product: Product;
  size: ItemSize | null;
  quantity: number;
  note: string;
  /** Per unit, size upcharge included. */
  price: number;
}

export interface CartChoice {
  size: ItemSize | null;
  quantity: number;
  note: string;
}

export interface Cart {
  lines: CartLine[];
  /** Units across all lines. */
  count: number;
  total: number;
  /** Units of one product across its lines, for the badge on its menu tile. */
  countOf: (productId: number) => number;
  add: (product: Product, choice: CartChoice) => void;
  setQuantity: (key: number, quantity: number) => void;
  remove: (key: number) => void;
  clear: () => void;
}

const clampQuantity = (n: number) => Math.min(Math.max(n, 1), MAX_QUANTITY);

export function useCart(): Cart {
  const [lines, setLines] = useState<CartLine[]>([]);
  const nextKey = useRef(1);

  const add = useCallback((product: Product, { size, quantity, note }: CartChoice) => {
    // Taken outside the updater, which StrictMode runs twice.
    const key = nextKey.current++;
    const trimmed = note.trim();
    setLines((current) => {
      // The same drink, size and request again tops up its line rather than adding a duplicate.
      const same = current.find((l) => l.product.product_id === product.product_id && l.size === size && l.note === trimmed);
      if (same) return current.map((l) => (l === same ? { ...l, quantity: clampQuantity(l.quantity + quantity) } : l));
      return [...current, { key, product, size, quantity: clampQuantity(quantity), note: trimmed, price: unitPrice(product, size) }];
    });
  }, []);

  const setQuantity = useCallback((key: number, quantity: number) => {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, quantity: clampQuantity(quantity) } : l)));
  }, []);

  const remove = useCallback((key: number) => setLines((current) => current.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  return useMemo(() => {
    const units = new Map<number, number>();
    for (const l of lines) units.set(l.product.product_id, (units.get(l.product.product_id) ?? 0) + l.quantity);
    return {
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      total: subtotalOf(lines.map((l) => ({ quantity: l.quantity, selling_price: l.price }))),
      countOf: (productId: number) => units.get(productId) ?? 0,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, add, setQuantity, remove, clear]);
}
