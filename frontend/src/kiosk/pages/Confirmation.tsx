import { useEffect, useState } from "react";
import HeroImage from "../../Home/Hero/HeroImage";
import { LOGO_MARK } from "../../Home/Hero/hero.config";
import { formatPeso, formatTime } from "../../POS/utils/format";
import { SIZE_LABELS } from "../../POS/utils/pricing";
import type { PlacedOrder } from "../data/orders";
import HomeLink from "../components/HomeLink";
import { PRIMARY_BUTTON } from "../styles";

/** The kiosk goes back to the menu on its own, so the next customer isn't left looking at this. */
const RESET_AFTER_SECONDS = 45;

/** The order as the backend saved and priced it, so it matches what the cashier sees. */
export interface Receipt extends PlacedOrder {
  /** Signed-in customer's first name, null for a guest. */
  firstName: string | null;
}

interface ConfirmationProps {
  receipt: Receipt;
  /** Paid online already; otherwise the customer pays at the counter. */
  paid?: boolean;
  /** Why the customer is paying at the counter after all, e.g. a cancelled online payment. */
  notice?: string | null;
  /** Must be stable: it also fires when the countdown runs out. */
  onDone: () => void;
}

/** The order number, big enough to read from the counter, and what to do next. */
export default function Confirmation({ receipt, paid = false, notice = null, onDone }: ConfirmationProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESET_AFTER_SECONDS);

  useEffect(() => {
    const id = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) onDone();
  }, [secondsLeft, onDone]);

  return (
    <main className="kiosk-dark flex min-h-dvh flex-col items-center justify-center bg-(--k-ink) px-4 py-10 text-(--k-canvas)">
      <div className="w-full max-w-md text-center">
        <HeroImage file={LOGO_MARK} alt="" placeholderShape="circle" className="mx-auto size-14 object-contain" />

        <h1 className="mt-8">
          <span className="block text-xs font-bold tracking-[0.3em] text-(--k-gold) uppercase">
            {receipt.firstName ? `Thanks, ${receipt.firstName}! Your number is` : "Your order number"}
          </span>
          <span className="hero-display mt-1 block text-[clamp(7rem,32vw,11rem)] leading-none text-(--k-gold) tabular-nums">
            {receipt.order_id}
          </span>
        </h1>

        {notice && (
          <p role="status" className="mx-auto mt-6 max-w-xs rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium">
            {notice}
          </p>
        )}
        <h2 className="hero-display mt-6 text-4xl uppercase sm:text-5xl">{paid ? "You're all paid" : "Pay at the counter"}</h2>
        <p className="mx-auto mt-3 max-w-xs text-base opacity-75">
          {paid
            ? "We're making your order now. Listen for your number at the counter."
            : "Tell the cashier your number. We'll start making your order as soon as it's paid."}
        </p>

        <div className="mt-8 rounded-[1.75rem] bg-(--k-canvas) p-5 text-left text-(--k-ink) sm:p-6">
          <p className="flex justify-between text-sm text-(--k-muted)">
            <span>Order #{receipt.order_id}</span>
            <span className="tabular-nums">{formatTime(receipt.ordered_at)}</span>
          </p>
          <ul className="mt-3 space-y-2">
            {receipt.items.map((i) => (
              <li key={i.order_item_id} className="flex justify-between gap-3 text-base">
                <span className="min-w-0">
                  <span className="font-extrabold tabular-nums">{i.quantity}×</span> {i.product_name}
                  {i.size && <span className="text-(--k-muted)"> · {SIZE_LABELS[i.size]}</span>}
                </span>
                <span className="font-semibold tabular-nums">{formatPeso(i.selling_price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-baseline justify-between border-t-2 border-(--k-ink) pt-4">
            <span className="text-sm font-bold tracking-[0.2em] uppercase">{paid ? "Paid" : "Total"}</span>
            <span className="text-2xl font-extrabold tabular-nums">{formatPeso(receipt.total_amount)}</span>
          </p>
        </div>

        <button type="button" autoFocus onClick={onDone} className={`${PRIMARY_BUTTON} mt-8 w-full px-8`}>
          Start a new order
        </button>
        <HomeLink />
        <p className="mt-4 text-sm tabular-nums opacity-60">Back to the menu in {Math.max(secondsLeft, 0)}s</p>
      </div>
    </main>
  );
}
