import { useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { usePosData } from "../data/posContext";
import type { CategoryChoice } from "../layout/SideBar";
import type { Category, Product } from "../types";
import { formatPeso } from "../utils/format";
import ProductArt from "./ProductArt";
import { FOCUS_RING, INPUT_CLASS } from "./styles";

interface MenuPanelProps {
  /** Picked in the sidebar. */
  category: CategoryChoice;
  onAdd: (product: Product) => void;
  /** Units already on the ticket, shown on the tile. */
  countOf: (productId: number) => number;
}

/** The menu, one section per category, so "Frappés" lists every frappé together. */
export default function MenuPanel({ category, onAdd, countOf }: MenuPanelProps) {
  const { db } = usePosData();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const selected = db.categories.find((c) => c.category_id === category);
  const groups = db.categories
    .filter((c) => category === "all" || c.category_id === category)
    .map((c) => ({
      category: c,
      products: db.products.filter((p) => p.category_id === c.category_id && (!q || p.product_name.toLowerCase().includes(q))),
    }))
    .filter((g) => g.products.length > 0);
  const shown = groups.reduce((n, g) => n + g.products.length, 0);

  return (
    <section aria-labelledby="pos-menu-heading" className="flex flex-col">
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 bg-(--pos-canvas)/90 px-4 py-3 backdrop-blur sm:flex-nowrap lg:top-0 lg:h-16 lg:px-6 lg:py-0">
        <h1 id="pos-menu-heading" className="text-base font-semibold whitespace-nowrap">
          {selected?.category_name ?? "All items"}
          <span className="ml-2 text-sm font-normal text-(--pos-muted) tabular-nums">{shown}</span>
        </h1>
        <div className="relative w-full sm:ml-auto sm:max-w-xs">
          <FiSearch aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--pos-muted)" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search the menu"
            className={`${INPUT_CLASS} h-9 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden`}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className={`absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-(--pos-muted) hover:text-(--pos-ink) ${FOCUS_RING}`}
            >
              <FiX aria-hidden className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-7 px-4 pt-2 pb-6 lg:px-6">
        {groups.map(({ category: c, products }) => (
          <section key={c.category_id} aria-labelledby={`pos-category-${c.category_id}`}>
            {category === "all" && (
              <h2
                id={`pos-category-${c.category_id}`}
                className="mb-2.5 text-[11px] font-medium tracking-wider text-(--pos-muted) uppercase"
              >
                {c.category_name}
              </h2>
            )}
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))]">
              {products.map((p) => (
                <li key={p.product_id}>
                  <ProductTile product={p} category={c} count={countOf(p.product_id)} onAdd={onAdd} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {groups.length === 0 && (
          <p className="py-16 text-center text-sm text-(--pos-muted)">
            {q ? `Nothing matches “${query.trim()}”.` : "No items in this category yet."}
          </p>
        )}
      </div>
    </section>
  );
}

interface ProductTileProps {
  product: Product;
  category: Category;
  count: number;
  onAdd: (product: Product) => void;
}

function ProductTile({ product, category, count, onAdd }: ProductTileProps) {
  return (
    <button
      type="button"
      disabled={!product.is_available}
      onClick={() => onAdd(product)}
      className={`flex h-full w-full items-center gap-3 rounded-xl p-2 pr-3 text-left transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING} ${
        count > 0
          ? "bg-(--pos-gold)/[0.08] ring-1 ring-(--pos-gold)/40 ring-inset hover:bg-(--pos-gold)/[0.12]"
          : "bg-white/[0.03] hover:bg-white/[0.07] disabled:hover:bg-white/[0.03]"
      }`}
    >
      <ProductArt product={product} category={category} className="size-12 shrink-0 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm leading-snug font-medium">{product.product_name}</span>
        <span className="mt-0.5 block text-xs text-(--pos-muted) tabular-nums">
          {product.is_available ? formatPeso(product.price) : "Unavailable"}
        </span>
      </span>
      {count > 0 && (
        <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-(--pos-gold) px-1.5 text-xs font-semibold text-(--pos-canvas) tabular-nums">
          {count}
          <span className="sr-only"> on the ticket</span>
        </span>
      )}
    </button>
  );
}
