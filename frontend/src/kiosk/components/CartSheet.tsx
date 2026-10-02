import { useId } from "react";
import { describeMethods, type PaymongoMethod } from "../../checkout/api";
import { formatPeso } from "../../POS/utils/format";
import { SIZE_LABELS } from "../../POS/utils/pricing";
import type { Cart } from "../data/useCart";
import { FOCUS_RING, PRIMARY_BUTTON, SECONDARY_BUTTON } from "../styles";
import ProductArt from "./ProductArt";
import QtyStepper from "./QtyStepper";
import Sheet, { CloseButton } from "./Sheet";

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
  cart: Cart;
  /** "Mika Reyes" when a customer is signed in, null for a guest. */
  customerName: string | null;
  /** What the order is being placed for, while it is. */
  placing: "online" | "counter" | null;
  /** The methods PayMongo checkout offers; empty when online payment is off, leaving only the counter. */
  onlineMethods: PaymongoMethod[];
  error: string | null;
  onPlaceOrder: (payOnline: boolean) => void;
}

/** Everything in the order, with quantities to adjust, then how to pay for it. */
export default function CartSheet({
  open,
  onClose,
  cart,
  customerName,
  placing,
  onlineMethods,
  error,
  onPlaceOrder,
}: CartSheetProps) {
  const headingId = useId();

  return (
    <Sheet open={open} onClose={onClose} labelledBy={headingId}>
      <header className="flex items-start justify-between gap-4 px-6 pt-7 pb-4 sm:px-8">
        <div>
          <h2 id={headingId} className="hero-display text-4xl leading-none uppercase sm:text-5xl">
            Your order
          </h2>
          <p className="mt-2 text-sm text-(--k-muted)">
            {customerName ? (
              <>
                Ordering as <span className="font-semibold text-(--k-ink)">{customerName}</span>
              </>
            ) : (
              "Ordering as a guest"
            )}
          </p>
        </div>
        <CloseButton onClick={onClose} className="shadow-none" />
      </header>

      <div className="kiosk-scroll min-h-0 flex-1 overflow-y-auto px-6 sm:px-8">
        <ul className="divide-y divide-(--k-line) border-y border-(--k-line)">
          {cart.lines.map((l) => {
            const details = [l.size && SIZE_LABELS[l.size], `${formatPeso(l.price)} each`].filter(Boolean).join(" · ");
            return (
              <li key={l.key} className="flex gap-4 py-4">
                <ProductArt product={l.product} variant="thumb" className="size-16 shrink-0 rounded-2xl sm:size-20" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base leading-snug font-extrabold">{l.product.product_name}</p>
                    <p className="text-base font-bold tabular-nums">{formatPeso(l.price * l.quantity)}</p>
                  </div>
                  <p className="text-sm text-(--k-muted) tabular-nums">{details}</p>
                  {l.note && <p className="mt-0.5 text-sm text-(--k-muted) italic">“{l.note}”</p>}
                  <div className="mt-2.5">
                    <QtyStepper
                      size="sm"
                      value={l.quantity}
                      name={l.product.product_name}
                      onChange={(q) => cart.setQuantity(l.key, q)}
                      onRemove={() => cart.remove(l.key)}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-center py-3">
          <button
            type="button"
            onClick={cart.clear}
            className={`rounded-full px-4 py-2.5 text-sm font-bold text-(--k-muted) hover:text-(--k-ink) ${FOCUS_RING}`}
          >
            Start over
          </button>
        </div>
      </div>

      <footer className="space-y-4 border-t border-(--k-line) px-6 py-5 sm:px-8">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold tracking-[0.2em] uppercase">Total</span>
          <span className="text-3xl font-extrabold tabular-nums">{formatPeso(cart.total)}</span>
        </div>
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
            {error}
          </p>
        )}
        {onlineMethods.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => onPlaceOrder(true)}
              disabled={placing !== null}
              className={`${PRIMARY_BUTTON} w-full px-8`}
            >
              {placing === "online" ? "Opening checkout…" : "Pay now"}
            </button>
            <button
              type="button"
              onClick={() => onPlaceOrder(false)}
              disabled={placing !== null}
              className={`${SECONDARY_BUTTON} w-full px-8`}
            >
              {placing === "counter" ? "Placing order…" : "Pay at the counter"}
            </button>
            <p className="text-center text-sm text-(--k-muted)">
              Pay now with {describeMethods(onlineMethods)}, or at the counter with your order number.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onPlaceOrder(false)}
              disabled={placing !== null}
              className={`${PRIMARY_BUTTON} w-full px-8`}
            >
              {placing ? "Placing order…" : "Place order"}
            </button>
            <p className="text-center text-sm text-(--k-muted)">You'll pay at the counter with your order number.</p>
          </>
        )}
      </footer>
    </Sheet>
  );
}
