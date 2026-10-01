import { useId, useState } from "react";
import type { ItemSize, Product } from "../../POS/types";
import { formatPeso } from "../../POS/utils/format";
import { SIZES, unitPrice } from "../../POS/utils/pricing";
import type { CartChoice } from "../data/useCart";
import { EYEBROW, FOCUS_WITHIN_RING, PRIMARY_BUTTON } from "../styles";
import ProductArt from "./ProductArt";
import QtyStepper from "./QtyStepper";
import Sheet, { CloseButton } from "./Sheet";

interface ProductSheetProps {
  /** The product being chosen, or null when the sheet is closed. */
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product, choice: CartChoice) => void;
}

/** Size, quantity and special requests for one product, then into the order. */
export default function ProductSheet({ product, onClose, onAdd }: ProductSheetProps) {
  const headingId = useId();
  return (
    <Sheet open={product !== null} onClose={onClose} labelledBy={headingId}>
      {product && (
        // Keyed so every product starts from a fresh size, quantity and note.
        <ProductForm key={product.product_id} product={product} headingId={headingId} onClose={onClose} onAdd={onAdd} />
      )}
    </Sheet>
  );
}

interface ProductFormProps {
  product: Product;
  headingId: string;
  onClose: () => void;
  onAdd: (product: Product, choice: CartChoice) => void;
}

function ProductForm({ product, headingId, onClose, onAdd }: ProductFormProps) {
  const [size, setSize] = useState<ItemSize | null>(product.has_sizes ? "tall" : null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const price = unitPrice(product, size);

  return (
    <>
      <div className="kiosk-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="relative">
          <ProductArt product={product} variant="hero" className="h-56 w-full sm:h-64" />
          <CloseButton onClick={onClose} className="absolute top-4 right-4" />
        </div>

        <div className="space-y-7 px-6 pt-6 pb-6 sm:px-8">
          <div>
            <h2 id={headingId} className="hero-display text-4xl leading-none uppercase sm:text-5xl">
              {product.product_name}
            </h2>
            {product.description && <p className="mt-3 text-base text-(--k-muted)">{product.description}</p>}
          </div>

          {product.has_sizes && (
            <fieldset>
              <legend className={`${EYEBROW} mb-3`}>Size</legend>
              <div className="grid grid-cols-3 gap-2.5">
                {SIZES.map((s) => {
                  const selected = size === s.value;
                  return (
                    <label
                      key={s.value}
                      className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-2xl px-2 py-3.5 text-center transition ${FOCUS_WITHIN_RING} ${
                        selected
                          ? "bg-(--k-ink) text-(--k-canvas)"
                          : "bg-(--k-surface) ring-1 ring-(--k-line) ring-inset hover:ring-(--k-ink)/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${headingId}-size`}
                        value={s.value}
                        checked={selected}
                        onChange={() => setSize(s.value)}
                        className="sr-only"
                      />
                      <span className="text-base font-extrabold">{s.label}</span>
                      <span className={`text-sm tabular-nums ${selected ? "opacity-80" : "text-(--k-muted)"}`}>
                        {formatPeso(unitPrice(product, s.value))}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <label className="block">
            <span className={`${EYEBROW} mb-3 block`}>
              Special requests <span className="font-medium tracking-normal text-(--k-muted) normal-case">(optional)</span>
            </span>
            <textarea
              rows={2}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. oat milk, extra shot, less ice"
              className="block w-full resize-none rounded-2xl border-0 bg-(--k-canvas) px-4 py-3 text-base ring-1 ring-(--k-line) ring-inset placeholder:text-(--k-muted) focus:ring-2 focus:ring-(--k-ink) focus:outline-none"
            />
          </label>
        </div>
      </div>

      <footer className="flex items-center gap-3 border-t border-(--k-line) bg-(--k-surface) px-5 py-4 sm:gap-4 sm:px-8 sm:py-5">
        <QtyStepper value={quantity} onChange={setQuantity} name={product.product_name} />
        <button
          type="button"
          onClick={() => onAdd(product, { size, quantity, note })}
          className={`${PRIMARY_BUTTON} min-w-0 flex-1 px-4 sm:px-6`}
        >
          Add
          <span aria-hidden className="opacity-60">·</span>
          <span className="tabular-nums">{formatPeso(price * quantity)}</span>
        </button>
      </footer>
    </>
  );
}
