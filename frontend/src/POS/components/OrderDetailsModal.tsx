import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import { usePosData } from "../data/posContext";
import { linesOf } from "../data/selectors";
import { formatPeso, formatTime, fullName } from "../utils/format";
import { PAYMENT_METHOD_LABELS, SIZE_LABELS, subtotalOf } from "../utils/pricing";
import { OrderTypeBadge, StatusBadge } from "./badges";
import Modal from "./Modal";
import { buttonClass } from "./styles";
import { useToast } from "./toastContext";

interface OrderDetailsModalProps {
  orderId: number | null;
  onClose: () => void;
}

export default function OrderDetailsModal({ orderId, onClose }: OrderDetailsModalProps) {
  const { db, completeOrder, cancelOrder } = usePosData();
  const notify = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const order = db.orders.find((o) => o.order_id === orderId);
  const close = () => {
    setConfirmCancel(false);
    onClose();
  };

  if (!order) return <Modal open={false} onClose={close} title="" />;

  const lines = linesOf(db, order.order_id);
  const customer = db.customers.find((c) => c.customer_id === order.customer_id);
  const payment = db.payments.find((p) => p.order_id === order.order_id);
  const discount = db.discounts.find((d) => d.discount_id === order.discount_id);
  const pending = order.order_status === "pending";

  const complete = () => {
    completeOrder(order.order_id);
    notify(`Order #${order.order_id} completed.`);
    close();
  };
  const cancel = () => {
    cancelOrder(order.order_id);
    notify(`Order #${order.order_id} cancelled.`, "info");
    close();
  };

  return (
    <Modal
      open
      onClose={close}
      title={
        <span className="flex flex-wrap items-center gap-2">
          Order #{order.order_id}
          <OrderTypeBadge type={order.order_type} />
          <StatusBadge status={order.order_status} />
        </span>
      }
      footer={
        pending ? (
          confirmCancel ? (
            <>
              <p className="mr-auto self-center text-sm text-(--pos-muted)">Cancel this order?</p>
              <button type="button" onClick={() => setConfirmCancel(false)} className={buttonClass("secondary")}>
                Keep it
              </button>
              <button type="button" onClick={cancel} className={buttonClass("danger")}>
                Yes, cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setConfirmCancel(true)} className={`${buttonClass("ghost")} mr-auto`}>
                Cancel order
              </button>
              <button type="button" onClick={complete} className={buttonClass("primary")}>
                <FiCheck aria-hidden className="size-4" />
                {order.order_type === "online" ? "Mark picked up" : "Mark served"}
              </button>
            </>
          )
        ) : (
          <button type="button" onClick={close} className={buttonClass("secondary")}>
            Close
          </button>
        )
      }
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-(--pos-muted)">Customer</dt>
          <dd className="font-medium">{customer ? fullName(customer) : "Guest"}</dd>
          {customer?.university_id && <dd className="text-xs text-(--pos-muted)">Student · {customer.university_id}</dd>}
        </div>
        <div>
          <dt className="text-xs text-(--pos-muted)">Placed</dt>
          <dd className="font-medium">{formatTime(order.ordered_at)}</dd>
          <dd className="text-xs text-(--pos-muted)">{order.order_type === "online" ? "via the website" : "at the counter"}</dd>
        </div>
        <div>
          <dt className="text-xs text-(--pos-muted)">Payment</dt>
          <dd className="font-medium">
            {payment ? `${PAYMENT_METHOD_LABELS[payment.payment_method]} · paid` : "Nothing to pay"}
          </dd>
        </div>
      </dl>

      <ul className="mt-5 divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {lines.map((l) => (
          <li key={l.order_item_id} className="flex items-start gap-3 py-3 text-sm">
            <span className="w-6 shrink-0 text-(--pos-muted) tabular-nums">{l.quantity}×</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{l.product?.product_name ?? "Unknown item"}</span>
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
          <dd className="tabular-nums">{formatPeso(subtotalOf(lines))}</dd>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between">
            <dt className="text-(--pos-muted)">Discount · {discount?.discount_name ?? "Custom"}</dt>
            <dd className="tabular-nums">− {formatPeso(order.discount_amount)}</dd>
          </div>
        )}
        <div className="flex justify-between pt-1 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPeso(order.total_amount)}</dd>
        </div>
      </dl>
    </Modal>
  );
}
