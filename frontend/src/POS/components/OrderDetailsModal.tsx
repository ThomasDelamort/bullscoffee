import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import { goToCheckout, usePaymentOptions } from "../../checkout/api";
import { errorMessage } from "../../lib/api";
import { useCancelOrder, useCompleteOrder, useOrder, usePayOrder } from "../api/orders";
import { useStartCheckout } from "../api/payments";
import { isPaid } from "../data/selectors";
import type { Tender } from "../types";
import { formatPeso, formatTime, round2 } from "../utils/format";
import { PAYMENT_METHOD_LABELS, paymentProblem, SIZE_LABELS, subtotalOf } from "../utils/pricing";
import { OrderSourceBadge, StatusBadge } from "./badges";
import Modal from "./Modal";
import PaymentFields from "./PaymentFields";
import { ErrorNotice, Loading } from "./QueryState";
import { buttonClass } from "./styles";
import { useToast } from "./toastContext";

const LABEL = "mb-1 block text-xs text-(--pos-muted)";

interface OrderDetailsModalProps {
  /** Key the modal by this, so payment input doesn't carry over to the next order. */
  orderId: number | null;
  onClose: () => void;
}

/** One order: what's on it, and the next step for it (charge, hand over, or cancel). */
export default function OrderDetailsModal({ orderId, onClose }: OrderDetailsModalProps) {
  const query = useOrder(orderId);
  const pay = usePayOrder();
  const complete = useCompleteOrder();
  const cancel = useCancelOrder();
  const startCheckout = useStartCheckout();
  const paymentOptions = usePaymentOptions();
  const onlineMethods = paymentOptions.data?.online ? paymentOptions.data.methods : [];
  const notify = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [method, setMethod] = useState<Tender>("cash");
  const [tendered, setTendered] = useState("");
  /** Shown after a cash payment until the modal closes. */
  const [changeDue, setChangeDue] = useState<number | null>(null);

  const order = query.data;
  const pending = order?.order_status === "pending";
  const unpaid = pending && !isPaid(order);
  // Leaving for PayMongo's checkout page shows as busy until the page goes.
  const openingCheckout = startCheckout.isPending || startCheckout.isSuccess;
  const busy = pay.isPending || complete.isPending || cancel.isPending || openingCheckout;
  const problem =
    order && unpaid
      ? method === "online" && onlineMethods.length === 0
        ? "Online payment is switched off."
        : paymentProblem(order.balance_due, method, tendered)
      : null;

  const takePayment = () => {
    if (!order || problem || busy) return;
    if (method === "online") {
      startCheckout.mutate(order.order_id, {
        onSuccess: ({ checkout_url }) => goToCheckout(checkout_url),
        onError: (e) => notify(errorMessage(e), "error"),
      });
      return;
    }
    const cash = Number(tendered) || 0;
    pay.mutate(
      { orderId: order.order_id, method },
      {
        onSuccess: (paid) => {
          const change = method === "cash" ? round2(cash - order.balance_due) : null;
          setChangeDue(change);
          notify(`Order #${paid.order_id} paid. It's in the queue to hand over.`);
        },
        onError: (e) => notify(errorMessage(e), "error"),
      },
    );
  };

  const finish = (action: "complete" | "cancel") => {
    if (!order || busy) return;
    const mutation = action === "complete" ? complete : cancel;
    mutation.mutate(order.order_id, {
      onSuccess: () => {
        notify(`Order #${order.order_id} ${action === "complete" ? "completed" : "cancelled"}.`, action === "complete" ? "success" : "info");
        onClose();
      },
      onError: (e) => notify(errorMessage(e), "error"),
    });
  };

  const footer = !pending ? (
    <button type="button" onClick={onClose} className={buttonClass("secondary")}>
      Close
    </button>
  ) : confirmCancel ? (
    <>
      <p className="mr-auto self-center text-sm text-(--pos-muted)">Cancel this order?</p>
      <button type="button" onClick={() => setConfirmCancel(false)} className={buttonClass("secondary")}>
        Keep it
      </button>
      <button type="button" disabled={busy} onClick={() => finish("cancel")} className={buttonClass("danger")}>
        Yes, cancel
      </button>
    </>
  ) : (
    <>
      <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className={`${buttonClass("ghost")} mr-auto`}>
        Cancel order
      </button>
      {unpaid ? (
        <button type="button" disabled={problem !== null || busy} onClick={takePayment} className={buttonClass("primary")}>
          {openingCheckout
            ? "Opening checkout…"
            : pay.isPending
              ? "Charging…"
              : method === "online"
                ? `Pay ${formatPeso(order.balance_due)} online`
                : `Charge ${formatPeso(order.balance_due)}`}
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => finish("complete")} className={buttonClass("primary")}>
          <FiCheck aria-hidden className="size-4" />
          {order?.order_source === "kiosk" ? "Mark picked up" : "Mark served"}
        </button>
      )}
    </>
  );

  return (
    <Modal
      open={orderId !== null}
      onClose={onClose}
      title={
        <span className="flex flex-wrap items-center gap-2">
          Order #{orderId}
          {order && <OrderSourceBadge source={order.order_source} />}
          {order && <StatusBadge status={order.order_status} />}
        </span>
      }
      footer={footer}
    >
      {query.isPending && <Loading label="Loading the order…" className="py-10" />}
      {query.error && <ErrorNotice title="Couldn't load this order" error={query.error} onRetry={() => void query.refetch()} />}

      {order && (
        <>
          {changeDue !== null && (
            <p className="mb-4 flex items-baseline justify-between rounded-lg bg-emerald-400/10 px-4 py-3 text-emerald-200 ring-1 ring-emerald-300/20 ring-inset">
              <span className="text-sm">Change due</span>
              <span className="text-xl font-semibold tabular-nums">{formatPeso(changeDue)}</span>
            </p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-(--pos-muted)">Customer</dt>
              <dd className="font-medium">{order.customer_name ?? "Guest"}</dd>
            </div>
            <div>
              <dt className="text-xs text-(--pos-muted)">Placed</dt>
              <dd className="font-medium">{formatTime(order.ordered_at)}</dd>
              <dd className="text-xs text-(--pos-muted)">{order.order_source === "kiosk" ? "at the kiosk" : "at the counter"}</dd>
            </div>
            <div>
              <dt className="text-xs text-(--pos-muted)">Payment</dt>
              <dd className="font-medium">
                {order.payments.length
                  ? order.payments
                      .map((p) => `${PAYMENT_METHOD_LABELS[p.payment_method]}${p.paymongo_payment_id ? " (PayMongo)" : ""}`)
                      .join(", ") + " · paid"
                  : order.total_amount > 0
                    ? "Not paid yet"
                    : "Nothing to pay"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-(--pos-muted)">Cashier</dt>
              <dd className="font-medium">{order.employee_name ?? "—"}</dd>
            </div>
          </dl>

          <ul className="mt-5 divide-y divide-white/6 border-y border-white/6">
            {order.items.map((l) => (
              <li key={l.order_item_id} className="flex items-start gap-3 py-3 text-sm">
                <span className="w-6 shrink-0 text-(--pos-muted) tabular-nums">{l.quantity}×</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{l.product_name}</span>
                  {l.size && <span className="block text-xs text-(--pos-muted)">{SIZE_LABELS[l.size]}</span>}
                  {l.special_instructions && (
                    <span className="mt-1 block text-xs text-amber-200/90 italic">“{l.special_instructions}”</span>
                  )}
                </span>
                <span className="tabular-nums">{formatPeso(l.selling_price * l.quantity)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-(--pos-muted)">Subtotal</dt>
              <dd className="tabular-nums">{formatPeso(subtotalOf(order.items))}</dd>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <dt className="text-(--pos-muted)">Discount · {order.discount_name ?? "Custom"}</dt>
                <dd className="tabular-nums">− {formatPeso(order.discount_amount)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-semibold">
              <dt>{unpaid ? "Due" : "Total"}</dt>
              <dd className="tabular-nums">{formatPeso(unpaid ? order.balance_due : order.total_amount)}</dd>
            </div>
          </dl>

          {unpaid && !confirmCancel && (
            <section aria-label="Take payment" className="mt-5 space-y-3 border-t border-(--pos-line) pt-4">
              <PaymentFields
                total={order.balance_due}
                method={method}
                onMethodChange={setMethod}
                onlineMethods={onlineMethods}
                tendered={tendered}
                onTenderedChange={setTendered}
                labelClassName={LABEL}
              />
            </section>
          )}
        </>
      )}
    </Modal>
  );
}
