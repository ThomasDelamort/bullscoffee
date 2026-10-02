import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import HeroImage from "../Home/Hero/HeroImage";
import { LOGO_MARK } from "../Home/Hero/hero.config";
import HomeLink from "../kiosk/components/HomeLink";
import { clearCheckoutReceipt, loadCheckoutReceipt } from "../kiosk/data/checkoutReceipt";
import Confirmation from "../kiosk/pages/Confirmation";
import { KIOSK_BASE_PATH } from "../kiosk/routes";
import { PRIMARY_BUTTON } from "../kiosk/styles";
import { errorMessage } from "../lib/api";
import { POS_BASE_PATH } from "../POS/routes";
import { useOrderPaymentStatus } from "./api";

/** How long to wait on PayMongo's webhook before suggesting the counter. */
const SLOW_AFTER_MS = 20_000;

export type CheckoutOutcome = "success" | "cancel";

/**
 * Where PayMongo sends the customer back to, with ?order_id=N. Landing on the
 * success page doesn't mean the payment went through: only PayMongo's webhook
 * marks the order paid, so this polls until it has. A kiosk order shows its
 * receipt and goes back to the menu; one from the register goes back there.
 */
export default function CheckoutReturn({ outcome }: { outcome: CheckoutOutcome }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(params.get("order_id"));
  const orderId = Number.isInteger(id) && id > 0 ? id : null;
  const status = useOrderPaymentStatus(orderId, outcome === "success");
  // Read once: it's cleared when the customer starts over.
  const [receipt] = useState(() => (orderId ? loadCheckoutReceipt(orderId) : null));
  const slow = useElapsed(SLOW_AFTER_MS);

  const backToKiosk = useCallback(() => {
    clearCheckoutReceipt();
    navigate(KIOSK_BASE_PATH, { replace: true });
  }, [navigate]);

  if (orderId === null) {
    return (
      <Screen
        title="Nothing to show"
        detail="This page needs an order number."
        action={
          <Link to="/" replace className={ACTION}>
            Go home
          </Link>
        }
      />
    );
  }
  if (status.isPending) return <Screen title="Checking your payment" busy />;
  if (status.error) {
    return (
      <Screen
        title="Couldn't check your payment"
        detail={errorMessage(status.error)}
        action={
          <button type="button" onClick={() => void status.refetch()} className={ACTION}>
            Try again
          </button>
        }
      />
    );
  }

  const order = status.data;
  const atKiosk = order.order_source === "kiosk";
  const back = atKiosk ? (
    <>
      <button type="button" autoFocus onClick={backToKiosk} className={ACTION}>
        Start a new order
      </button>
      <HomeLink />
    </>
  ) : (
    <Link to={POS_BASE_PATH} replace className={ACTION}>
      Back to the register
    </Link>
  );

  if (order.order_status === "cancelled") {
    return (
      <Screen
        orderId={order.order_id}
        title="Order cancelled"
        detail={
          order.paid
            ? "This order was cancelled after it was paid. Ask the cashier about a refund."
            : "This order was cancelled before it was paid."
        }
        action={back}
      />
    );
  }

  if (order.paid) {
    if (atKiosk && receipt) return <Confirmation receipt={receipt} paid onDone={backToKiosk} />;
    return (
      <Screen
        orderId={order.order_id}
        title={atKiosk ? "You're all paid" : "Payment received"}
        detail={
          atKiosk
            ? "We're making your order now. Listen for your number at the counter."
            : "The order is paid and in the queue to make."
        }
        action={back}
      />
    );
  }

  if (outcome === "cancel") {
    const notice = "Payment cancelled. You can still pay at the counter.";
    if (atKiosk && receipt) return <Confirmation receipt={receipt} notice={notice} onDone={backToKiosk} />;
    return (
      <Screen
        orderId={order.order_id}
        title="Payment cancelled"
        detail={
          atKiosk
            ? "Your order is still placed. Tell the cashier your number and pay at the counter."
            : "The order is still open. Take payment another way from the register's order list."
        }
        action={back}
      />
    );
  }

  return (
    <Screen
      orderId={order.order_id}
      title="Confirming your payment"
      busy
      detail={
        !slow
          ? "This only takes a few seconds."
          : atKiosk
            ? "This is taking a while. If you've paid, show this number to the cashier."
            : "This is taking a while. If it doesn't come through, check the webhook log in the PayMongo dashboard."
      }
      action={slow ? back : undefined}
    />
  );
}

const ACTION = `${PRIMARY_BUTTON} mt-8 w-full px-8`;

interface ScreenProps {
  orderId?: number;
  title: string;
  detail?: string;
  /** Pulses the logo while something is still loading or being confirmed. */
  busy?: boolean;
  action?: ReactNode;
}

/** The kiosk confirmation's look, for when there's no receipt to show. */
function Screen({ orderId, title, detail, busy = false, action }: ScreenProps) {
  return (
    <main className="kiosk-dark flex min-h-dvh flex-col items-center justify-center bg-(--k-ink) px-4 py-10 text-(--k-canvas)">
      <div aria-live="polite" className="w-full max-w-md text-center">
        <HeroImage
          file={LOGO_MARK}
          alt=""
          placeholderShape="circle"
          className={`mx-auto size-14 object-contain ${busy ? "motion-safe:animate-pulse" : ""}`}
        />
        {orderId !== undefined && (
          <p className="mt-8">
            <span className="block text-xs font-bold tracking-[0.3em] text-(--k-gold) uppercase">Order number</span>
            <span className="hero-display mt-1 block text-[clamp(6rem,28vw,9rem)] leading-none text-(--k-gold) tabular-nums">
              {orderId}
            </span>
          </p>
        )}
        <h1 className="hero-display mt-6 text-4xl uppercase sm:text-5xl">{title}</h1>
        {detail && <p className="mx-auto mt-3 max-w-xs text-base opacity-75">{detail}</p>}
        {action}
      </div>
    </main>
  );
}

/** False until `ms` has passed since mount. */
function useElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setElapsed(true), ms);
    return () => window.clearTimeout(id);
  }, [ms]);
  return elapsed;
}
