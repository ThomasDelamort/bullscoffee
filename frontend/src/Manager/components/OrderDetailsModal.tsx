import type { ReactNode } from "react";
import { useManagerData } from "../data/dataContext";
import { lookups } from "../data/selectors";
import { formatDateTime, formatPeso, fullName } from "../utils/format";
import { SIZE_LABELS, subtotalOf } from "../utils/pricing";
import Badge from "./Badge";
import Modal from "./Modal";
import { ORDER_STATUS, PAYMENT_METHOD_LABELS } from "./status";

interface OrderDetailsModalProps {
  orderId: number | null;
  onClose: () => void;
  /** Buttons for the footer, e.g. complete or cancel. */
  footer?: ReactNode;
}

export default function OrderDetailsModal({ orderId, onClose, footer }: OrderDetailsModalProps) {
  const { db } = useManagerData();
  const order = orderId === null ? undefined : db.orders.find((o) => o.order_id === orderId);
  if (!order) return <Modal open={false} onClose={onClose} title="" />;

  const { employees, customers, products } = lookups(db);
  const items = db.order_items.filter((i) => i.order_id === order.order_id);
  const payments = db.payments.filter((p) => p.order_id === order.order_id);
  const customer = order.customer_id === null ? undefined : customers.get(order.customer_id);
  const cashier = employees.get(order.employee_id);
  const status = ORDER_STATUS[order.order_status];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Order #${order.order_id}`}
      description={formatDateTime(order.ordered_at)}
      footer={footer}
    >
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-(--mgr-muted)">Status</dt>
          <dd className="mt-1">
            <Badge tone={status.tone} dot>{status.label}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-(--mgr-muted)">Customer</dt>
          <dd className="mt-1 font-medium">
            {customer ? fullName(customer) : "Walk-in"}
            {customer?.university_id && (
              <span className="block text-xs font-normal text-(--mgr-muted)">ID {customer.university_id}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-(--mgr-muted)">Handled by</dt>
          <dd className="mt-1 font-medium">{cashier ? fullName(cashier) : "—"}</dd>
        </div>
      </dl>

      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="border-b border-(--mgr-line) text-left text-xs text-(--mgr-muted)">
            <th scope="col" className="pb-2 font-medium">Item</th>
            <th scope="col" className="pb-2 text-right font-medium">Qty</th>
            <th scope="col" className="pb-2 text-right font-medium">Price</th>
            <th scope="col" className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.order_item_id} className="border-b border-(--mgr-line) align-top">
              <td className="py-2 pr-3">
                <p className="font-medium">{products.get(item.product_id)?.product_name}</p>
                {(item.size || item.special_instructions) && (
                  <p className="text-xs text-(--mgr-muted)">
                    {[item.size && SIZE_LABELS[item.size], item.special_instructions].filter(Boolean).join(" · ")}
                  </p>
                )}
              </td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums">{formatPeso(item.selling_price)}</td>
              <td className="py-2 text-right tabular-nums">{formatPeso(item.quantity * item.selling_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-4 ml-auto w-full max-w-60 space-y-1 text-sm">
        <Row label="Subtotal" value={formatPeso(subtotalOf(items))} />
        {order.discount_amount > 0 && <Row label="Discount" value={`− ${formatPeso(order.discount_amount)}`} />}
        <Row label="Total" value={formatPeso(order.total_amount)} strong />
      </dl>

      <h3 className="mt-5 text-xs font-medium text-(--mgr-muted)">Payments</h3>
      {payments.length ? (
        <ul className="mt-2 divide-y divide-(--mgr-line) rounded-lg ring-1 ring-(--mgr-line)">
          {payments.map((p) => (
            <li key={p.payment_id} className="flex justify-between px-3 py-2 text-sm">
              <span>
                {PAYMENT_METHOD_LABELS[p.payment_method]}
                <span className="ml-2 text-xs text-(--mgr-muted)">{formatDateTime(p.paid_at)}</span>
              </span>
              <span className="tabular-nums">{formatPeso(p.amount_paid)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-(--mgr-muted)">No payment recorded.</p>
      )}
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-(--mgr-line) pt-1 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-(--mgr-muted)"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
