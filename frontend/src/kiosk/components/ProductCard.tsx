import { FiPlus } from "react-icons/fi";
import type { Product } from "../../POS/types";
import { formatPeso } from "../../POS/utils/format";
import { FOCUS_WITHIN_RING } from "../styles";
import ProductArt from "./ProductArt";

interface ProductCardProps {
  product: Product;
  /** Units already in the order. */
  inCart: number;
  onPick: (product: Product) => void;
}

/** A menu tile. The whole card is one tap target (a stretched button on the name). */
export default function ProductCard({ product, inCart, onPick }: ProductCardProps) {
  const soldOut = !product.is_available;

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-(--k-surface) shadow-[0_18px_40px_-28px_rgba(42,26,16,0.55)] ring-1 ring-(--k-line) transition ${FOCUS_WITHIN_RING} ${
        soldOut ? "" : "hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-26px_rgba(42,26,16,0.6)] active:scale-[0.985]"
      }`}
    >
      <div className="relative">
        <ProductArt product={product} className={`aspect-[4/3] w-full ${soldOut ? "opacity-50 grayscale" : ""}`} />
        {inCart > 0 && (
          <span className="absolute top-3 left-3 rounded-full bg-(--k-ink) px-3 py-1 text-xs font-bold text-(--k-canvas) tabular-nums shadow">
            {inCart} in order
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="text-base leading-tight font-extrabold sm:text-lg">
          <button
            type="button"
            disabled={soldOut}
            onClick={() => onPick(product)}
            className="text-left outline-none after:absolute after:inset-0 after:content-[''] disabled:cursor-not-allowed"
          >
            {product.product_name}
            {soldOut && <span className="sr-only">, sold out</span>}
          </button>
        </h2>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-(--k-muted)">{product.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className={`text-base font-bold tabular-nums sm:text-lg ${soldOut ? "text-(--k-muted)" : ""}`}>
            {formatPeso(product.price)}
          </span>
          {soldOut ? (
            <span className="rounded-full bg-(--k-canvas) px-3 py-1.5 text-xs font-bold tracking-wider text-(--k-muted) uppercase">
              Sold out
            </span>
          ) : (
            <span
              aria-hidden
              className="grid size-11 place-items-center rounded-full bg-(--k-gold) text-(--k-ink) transition group-hover:scale-110 group-active:scale-95"
            >
              <FiPlus className="size-5" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
