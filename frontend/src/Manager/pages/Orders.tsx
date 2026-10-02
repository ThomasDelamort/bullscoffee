import { useState } from "react";
import { FiCheck, FiCreditCard, FiDownload, FiEye, FiX } from "react-icons/fi";
import { useCancelOrder, useCompleteOrder, useOrder, useOrders } from "../api/orders";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Select } from "../components/Field";
import Modal from "../components/Modal";
import OrderDetailsModal from "../components/OrderDetailsModal";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, LoadingRow } from "../components/QueryState";
import RowAction from "../components/RowAction";
import SearchInput from "../components/SearchInput";
import { AWAITING_PAYMENT, ORDER_STATUS } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import TakePaymentModal from "../components/TakePaymentModal";
import { useNotifyError, useToast } from "../components/toastContext";
import { needsPayment } from "../data/selectors";
import type { Order, OrderStatus } from "../types";
import { sumBy } from "../utils/collections";
import { downloadCsv } from "../utils/csv";
import { addDays, dayKey, startOfDay } from "../utils/dates";
import { formatDateTime, formatPeso, formatRelative } from "../utils/format";
import { useDebouncedValue } from "../utils/useDebouncedValue";

type StatusFilter = OrderStatus | "all";
type Range = "today" | "yesterday" | "7d" | "30d" | "all";

const RANGES: Record<Range, { label: string; from: number; to: number }> = {
  today: { label: "Today", from: 0, to: 0 },
  yesterday: { label: "Yesterday", from: 1, to: 1 },
  "7d": { label: "Last 7 days", from: 6, to: 0 },
  "30d": { label: "Last 30 days", from: 29, to: 0 },
  all: { label: "All time", from: Infinity, to: 0 },
};

const PAGE_SIZE = 50;

function rangeBounds(range: Range): { from?: string; to: string } {
  const { from, to } = RANGES[range];
  const today = startOfDay(new Date());
  return {
    from: from === Infinity ? undefined : dayKey(addDays(today, -from)),
    to: dayKey(addDays(today, -to)),
  };
}

export default function Orders() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [range, setRange] = useState<Range>("today");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);

  const search = useDebouncedValue(query.trim().replace(/^#/, "")) || undefined;
  // Pending orders are a live queue, so they ignore the date range; the rest is filtered server-side.
  const queue = useOrders({ status: "pending", search }, { live: true });
  const history = useOrders({ ...rangeBounds(range), search });
  const completeOrder = useCompleteOrder();
  const cancelOrder = useCancelOrder();
  const cancellingDetails = useOrder(cancelling?.order_id ?? null);

  const matching = [
    ...(queue.data ?? []).filter((o) => o.order_status === "pending"),
    ...(history.data ?? []).filter((o) => o.order_status !== "pending"),
  ];
  const count = (s: OrderStatus) => matching.filter((o) => o.order_status === s).length;
  const visible = matching
    .filter((o) => status === "all" || o.order_status === status)
    .sort((a, b) =>
      status === "pending" ? a.ordered_at.localeCompare(b.ordered_at) : b.ordered_at.localeCompare(a.ordered_at),
    );
  const showsQueue = status === "pending" || status === "all";
  const showsHistory = status !== "pending";
  const loading = (showsQueue && queue.isPending) || (showsHistory && history.isPending);
  const failed = (showsQueue && queue.error) || (showsHistory && history.error);

  const complete = (o: Order, then?: () => void) =>
    completeOrder.mutate(o.order_id, {
      onSuccess: () => {
        notify(`Order #${o.order_id} completed.`);
        then?.();
      },
      onError: notifyError,
    });

  const confirmCancel = () => {
    if (!cancelling) return;
    const { order_id } = cancelling;
    cancelOrder.mutate(order_id, {
      onSuccess: () => {
        notify(`Order #${order_id} cancelled.`, "info");
        setCancelling(null);
        setViewing(null);
      },
      onError: notifyError,
    });
  };

  const exportCsv = () => {
    downloadCsv(
      `orders-${range}-${dayKey(new Date())}.csv`,
      visible.map((o) => ({
        order_id: o.order_id,
        ordered_at: o.ordered_at,
        status: o.order_status,
        customer: o.customer_name ?? "Walk-in",
        cashier: o.employee_name ?? "Kiosk",
        discount: o.discount_amount,
        total: o.total_amount,
      })),
    );
  };

  const paidForCancel = sumBy(cancellingDetails.data?.payments ?? [], (p) => p.amount_paid);
  const viewed = viewing && matching.find((o) => o.order_id === viewing.order_id);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Work the queue, look up past orders and cancel mistakes. The queue refreshes on its own as orders come in."
        actions={
          <Button icon={FiDownload} onClick={exportCsv} disabled={visible.length === 0}>
            Export CSV
          </Button>
        }
      />

      {failed && (
        <ErrorNotice
          className="mb-4"
          title="Couldn't load orders"
          error={failed}
          onRetry={() => void Promise.all([queue.refetch(), history.refetch()])}
        />
      )}

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4 xl:flex-row xl:items-center xl:justify-between">
          <Tabs
            label="Filter by status"
            value={status}
            onChange={(s) => {
              setStatus(s);
              setLimit(PAGE_SIZE);
            }}
            options={[
              { value: "pending", label: "Queue", count: count("pending") },
              { value: "completed", label: "Completed", count: count("completed") },
              { value: "cancelled", label: "Cancelled", count: count("cancelled") },
              { value: "all", label: "All", count: matching.length },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={query} onChange={setQuery} placeholder="Order #, customer or cashier" className="sm:w-60" />
            <Select
              aria-label="Date range"
              value={range}
              onChange={(e) => {
                setRange(e.target.value as Range);
                setLimit(PAGE_SIZE);
              }}
              className="sm:w-40"
              disabled={status === "pending"}
              title={status === "pending" ? "The queue always shows every pending order" : undefined}
            >
              {Object.entries(RANGES).map(([value, r]) => (
                <option key={value} value={value}>{r.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Handled by</Th>
              <Th className="text-right">Total</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow colSpan={6} label="Loading orders…" />}
            {!loading &&
              visible.slice(0, limit).map((o) => {
                const unpaid = needsPayment(o);
                const s = unpaid ? AWAITING_PAYMENT : ORDER_STATUS[o.order_status];
                const pending = o.order_status === "pending";
                return (
                  <tr key={o.order_id} className="hover:bg-(--mgr-canvas)/50">
                    <Td>
                      <p className="font-medium">#{o.order_id}</p>
                      <p className="text-xs text-(--mgr-muted)">
                        {pending ? formatRelative(o.ordered_at) : formatDateTime(o.ordered_at)}
                      </p>
                    </Td>
                    <Td>{o.customer_name ?? "Walk-in"}</Td>
                    <Td className="text-(--mgr-muted)">{o.employee_name ?? "Kiosk"}</Td>
                    <Td className="text-right tabular-nums">
                      {formatPeso(o.total_amount)}
                      {o.discount_amount > 0 && (
                        <span className="block text-xs text-(--mgr-muted)">−{formatPeso(o.discount_amount)} disc.</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={s.tone} dot>{s.label}</Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <RowAction icon={FiEye} label={`View order #${o.order_id}`} onClick={() => setViewing(o)} />
                        {pending && (
                          <>
                            {unpaid ? (
                              <RowAction icon={FiCreditCard} label={`Take payment for order #${o.order_id}`} onClick={() => setPaying(o)} />
                            ) : (
                              <RowAction icon={FiCheck} label={`Complete order #${o.order_id}`} onClick={() => complete(o)} />
                            )}
                            <RowAction icon={FiX} label={`Cancel order #${o.order_id}`} danger onClick={() => setCancelling(o)} />
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            {!loading && !failed && visible.length === 0 && (
              <EmptyRow colSpan={6}>{status === "pending" ? "The queue is clear." : "No orders match these filters."}</EmptyRow>
            )}
          </tbody>
        </Table>
        {visible.length > limit && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-(--mgr-muted)">
            <span>
              Showing {limit} of {visible.length}
            </span>
            <Button size="sm" onClick={() => setLimit(limit + PAGE_SIZE)}>
              Show more
            </Button>
          </div>
        )}
      </Card>

      <OrderDetailsModal
        orderId={viewing?.order_id ?? null}
        onClose={() => setViewing(null)}
        footer={
          viewed?.order_status === "pending" && (
            <>
              <Button variant="danger" icon={FiX} onClick={() => setCancelling(viewed)}>
                Cancel order
              </Button>
              {needsPayment(viewed) ? (
                <Button variant="primary" icon={FiCreditCard} onClick={() => setPaying(viewed)}>
                  Take payment
                </Button>
              ) : (
                <Button
                  variant="primary"
                  icon={FiCheck}
                  disabled={completeOrder.isPending}
                  onClick={() => complete(viewed, () => setViewing(null))}
                >
                  Mark completed
                </Button>
              )}
            </>
          )
        }
      />

      <TakePaymentModal
        key={`pay-${paying?.order_id ?? "closed"}`}
        order={paying}
        onClose={() => setPaying(null)}
        onPaid={() => setViewing(null)}
      />

      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        size="sm"
        title={`Cancel order #${cancelling?.order_id ?? ""}?`}
        description={
          paidForCancel > 0
            ? `The customer already paid ${formatPeso(paidForCancel)}. Refund it before cancelling. Cancelled orders don't count toward sales.`
            : "Cancelled orders don't count toward sales."
        }
        footer={
          <>
            <Button onClick={() => setCancelling(null)}>Keep order</Button>
            <Button variant="danger" onClick={confirmCancel} disabled={cancelOrder.isPending}>
              {cancelOrder.isPending ? "Cancelling…" : "Cancel order"}
            </Button>
          </>
        }
      />
    </>
  );
}
