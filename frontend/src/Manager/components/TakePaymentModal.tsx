import { useState } from "react";
import { usePayOrder } from "../api/orders";
import type { Order, PaymentMethod } from "../types";
import { formatPeso } from "../utils/format";
import { paymentCovers } from "../utils/pricing";
import Button from "./Button";
import Modal from "./Modal";
import PaymentFields from "./PaymentFields";
import { PAYMENT_METHOD_LABELS } from "./status";
import { useNotifyError, useToast } from "./toastContext";

interface TakePaymentModalProps {
  /** The unpaid order being charged, or null when closed. Key the modal by it so each order starts fresh. */
  order: Order | null;
  onClose: () => void;
  /** After the payment is recorded, e.g. to close the order details behind this. */
  onPaid?: () => void;
}

/**
 * Charges a kiosk order at the counter, for its whole balance. Paying doesn't
 * complete the order: it stays in the queue until it's handed over.
 */
export default function TakePaymentModal({ order, onClose, onPaid }: TakePaymentModalProps) {
  const notify = useToast();
  const notifyError = useNotifyError();
  const payOrder = usePayOrder();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tendered, setTendered] = useState("");

  const due = order?.balance_due ?? 0;
  const ready = paymentCovers(method, Number(tendered) || 0, due);

  const charge = () => {
    if (!order || !ready || payOrder.isPending) return;
    payOrder.mutate(
      { orderId: order.order_id, method },
      {
        onSuccess: () => {
          notify(`Order #${order.order_id} paid by ${PAYMENT_METHOD_LABELS[method].toLowerCase()}. It's in the queue.`);
          onPaid?.();
          onClose();
        },
        onError: notifyError,
      },
    );
  };

  return (
    <Modal
      open={order !== null}
      onClose={onClose}
      size="sm"
      title={`Take payment · order #${order?.order_id ?? ""}`}
      description={order ? `${order.customer_name ?? "Walk-in"}, ordered at the kiosk` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Not now</Button>
          <Button variant="primary" onClick={charge} disabled={!ready || payOrder.isPending}>
            {payOrder.isPending ? "Charging…" : `Charge ${formatPeso(due)}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="flex items-baseline justify-between">
          <span className="text-sm text-(--mgr-muted)">Amount due</span>
          <span className="text-2xl font-semibold tabular-nums">{formatPeso(due)}</span>
        </p>
        <PaymentFields
          total={due}
          method={method}
          onMethodChange={setMethod}
          tendered={tendered}
          onTenderedChange={setTendered}
        />
        <p className="text-xs text-(--mgr-muted)">The order stays in the queue. Complete it once it's handed over.</p>
      </div>
    </Modal>
  );
}
