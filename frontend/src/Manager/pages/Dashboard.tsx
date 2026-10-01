import { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiClipboard,
  FiPackage,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { useProducts, useRecipes } from "../api/catalog";
import { useFeedback } from "../api/feedback";
import { useIngredients } from "../api/inventory";
import { useCompleteOrder, useOrder, useOrders } from "../api/orders";
import { useAttendance, useEmployees } from "../api/staff";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import BarChart from "../components/charts/BarChart";
import ChartCard from "../components/charts/ChartCard";
import LineChart from "../components/charts/LineChart";
import OrderDetailsModal from "../components/OrderDetailsModal";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading } from "../components/QueryState";
import Stars from "../components/Stars";
import StatCard from "../components/StatCard";
import { STOCK_STATE } from "../components/status";
import { buttonClass, FOCUS_RING } from "../components/styles";
import { useNotifyError, useToast } from "../components/toastContext";
import { describeItems, isSale, salesTotals, STORE_HOURS, stockState } from "../data/selectors";
import { managerPath } from "../routes";
import type { Order, SeriesPoint } from "../types";
import { groupBy, indexBy } from "../utils/collections";
import { addDays, dayKey, startOfDay } from "../utils/dates";
import {
  formatChange,
  formatHourShort,
  formatNumber,
  formatPeso,
  formatPesoWhole,
  formatRelative,
  formatShortDate,
  formatTime,
  fullName,
} from "../utils/format";
import { formatClock, parseSchedule, worksOn } from "../utils/schedule";

const NO_IDS: readonly number[] = [];

export default function Dashboard() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const [openOrder, setOpenOrder] = useState<Order | null>(null);

  const now = new Date();
  const today = dayKey(now);
  const recent = useOrders({ from: dayKey(addDays(startOfDay(now), -13)), to: today });
  const queue = useOrders({ status: "pending" }, { live: true });
  const ingredientsQuery = useIngredients();
  const products = useProducts();
  const employees = useEmployees();
  const attendance = useAttendance({ from: today, to: today });
  const feedback = useFeedback();
  const completeOrder = useCompleteOrder();

  const ingredients = useMemo(() => ingredientsQuery.data ?? [], [ingredientsQuery.data]);
  const byDay = useMemo(() => groupBy(recent.data ?? [], (o) => dayKey(o.ordered_at)), [recent.data]);

  const todayOrders = byDay.get(today) ?? [];
  const todayTotals = salesTotals(todayOrders);
  const sameTimeYesterday = addDays(now, -1);
  const yesterdaySoFar = (byDay.get(dayKey(sameTimeYesterday)) ?? []).filter(
    (o) => new Date(o.ordered_at) <= sameTimeYesterday,
  );
  const salesChange = formatChange(todayTotals.net, salesTotals(yesterdaySoFar).net);

  const pending = (queue.data ?? [])
    .filter((o) => o.order_status === "pending")
    .sort((a, b) => a.ordered_at.localeCompare(b.ordered_at));

  const alerts = ingredients
    .filter((i) => i.is_active && stockState(i) !== "in")
    .sort((a, b) => a.current_quantity / (a.minimum_stock_level || 1) - b.current_quantity / (b.minimum_stock_level || 1));
  const outIds = new Set(alerts.filter((i) => stockState(i) === "out").map((i) => i.ingredient_id));

  // Recipes only matter when something is out of stock, so most days this costs no requests.
  const productIds = useMemo(() => (products.data ?? []).map((p) => p.product_id), [products.data]);
  const { recipes } = useRecipes(outIds.size > 0 ? productIds : NO_IDS);
  const blocked = (products.data ?? []).filter(
    (p) => p.is_available && (recipes.get(p.product_id) ?? []).some((r) => outIds.has(r.ingredient_id)),
  );
  const ingredientNames = indexBy(ingredients, (i) => i.ingredient_id);

  const logs = attendance.data ?? [];
  const onShift = logs.filter((l) => !l.time_out);
  const scheduledToday = (employees.data ?? []).filter(
    (e) => e.employee_status === "active" && worksOn(parseSchedule(e.work_schedule), now),
  );
  const latestFeedback = [...(feedback.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4);

  const salesSeries: SeriesPoint[] = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(startOfDay(now), i - 13);
    return { label: formatShortDate(d), value: salesTotals(byDay.get(dayKey(d)) ?? []).net };
  });
  const hourly: SeriesPoint[] = STORE_HOURS.map((h) => ({
    label: formatHourShort(h),
    value: todayOrders.filter((o) => isSale(o) && new Date(o.ordered_at).getHours() === h).length,
  }));

  const complete = (orderId: number, then?: () => void) =>
    completeOrder.mutate(orderId, {
      onSuccess: () => {
        notify(`Order #${orderId} completed.`);
        then?.();
      },
      onError: notifyError,
    });

  const failed = recent.error ?? queue.error ?? ingredientsQuery.error ?? employees.error ?? attendance.error;
  const loadingCounts = recent.isPending || queue.isPending;
  const dash = (loading: boolean, value: string | number) => (loading ? "—" : value);

  return (
    <>
      <PageHeader title="Dashboard" description="Today's sales, the order queue, stock and staff at a glance." />

      {failed && (
        <ErrorNotice
          className="mb-6"
          title="Some of the dashboard didn't load"
          error={failed}
          onRetry={() =>
            void Promise.all([recent.refetch(), queue.refetch(), ingredientsQuery.refetch(), employees.refetch(), attendance.refetch()])
          }
        />
      )}

      {blocked.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-900 ring-1 ring-red-200">
          <FiAlertTriangle aria-hidden className="size-5 shrink-0" />
          <p className="flex-1">
            <span className="font-semibold">{[...outIds].map((id) => ingredientNames.get(id)?.ingredient_name).join(", ")}</span>{" "}
            {outIds.size === 1 ? "is" : "are"} out of stock, so {blocked.map((p) => p.product_name).join(", ")} can't be
            made.
          </p>
          <Link to={managerPath("suppliers")} className={buttonClass("secondary", "sm")}>
            Record a delivery
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales today"
          value={dash(recent.isPending, formatPeso(todayTotals.net))}
          hint={salesChange ? `${salesChange} vs this time yesterday` : "Completed orders only"}
          icon={FiTrendingUp}
        />
        <StatCard
          label="Orders today"
          value={dash(loadingCounts, formatNumber(todayTotals.orders))}
          hint={pending.length ? `${pending.length} waiting in the queue` : "Queue is clear"}
          icon={FiClipboard}
        />
        <StatCard
          label="Staff on shift"
          value={dash(attendance.isPending, onShift.length)}
          hint={`${scheduledToday.length} scheduled today`}
          icon={FiUsers}
        />
        <StatCard
          label="Stock alerts"
          value={dash(ingredientsQuery.isPending, alerts.length)}
          hint={outIds.size ? `${outIds.size} out of stock` : "Nothing out of stock"}
          icon={FiPackage}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard
            title="Net sales"
            description="Last 14 days, completed orders after discounts"
            data={salesSeries}
            columns={["Day", "Net sales"]}
            format={formatPesoWhole}
          >
            <LineChart data={salesSeries} label="Net sales over the last 14 days" format={formatPesoWhole} xLabelEvery={2} />
          </ChartCard>
        </div>
        <div className="xl:col-span-2">
          <ChartCard
            title="Orders by hour"
            description="Today, completed orders"
            data={hourly}
            columns={["Hour", "Orders"]}
            format={formatNumber}
          >
            <BarChart data={hourly} label="Orders per hour today" format={formatNumber} />
          </ChartCard>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          className="xl:col-span-3"
          title="Order queue"
          description="Waiting to be handed over, oldest first"
          flush
          actions={<ViewAll to={managerPath("orders")} />}
        >
          {queue.isPending ? (
            <Loading />
          ) : pending.length ? (
            <ul className="divide-y divide-(--mgr-line)">
              {pending.slice(0, 6).map((order) => (
                <li key={order.order_id} className="flex items-center gap-3 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenOrder(order)}
                    className={`min-w-0 flex-1 rounded-md text-left ${FOCUS_RING}`}
                  >
                    <p className="truncate text-sm font-medium">
                      #{order.order_id} · {order.customer_name ?? "Walk-in"}
                    </p>
                    <QueueItems orderId={order.order_id} />
                  </button>
                  <span className="hidden text-xs whitespace-nowrap text-(--mgr-muted) sm:block">
                    {formatRelative(order.ordered_at)}
                  </span>
                  <Button size="sm" icon={FiCheck} onClick={() => complete(order.order_id)}>
                    Complete
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-(--mgr-muted)">No orders waiting.</p>
          )}
        </Card>

        <Card className="xl:col-span-2" title="Stock alerts" flush actions={<ViewAll to={managerPath("inventory")} />}>
          {ingredientsQuery.isPending ? (
            <Loading />
          ) : alerts.length ? (
            <ul className="divide-y divide-(--mgr-line)">
              {alerts.slice(0, 6).map((i) => {
                const state = STOCK_STATE[stockState(i)];
                return (
                  <li key={i.ingredient_id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.ingredient_name}</p>
                      <p className="text-xs text-(--mgr-muted) tabular-nums">
                        {formatNumber(i.current_quantity)} / {formatNumber(i.minimum_stock_level)} {i.unit_of_measure} minimum
                      </p>
                    </div>
                    <Badge tone={state.tone} dot>{state.label}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-(--mgr-muted)">Everything is above its minimum.</p>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Latest feedback" flush actions={<ViewAll to={managerPath("feedback")} />}>
          {feedback.isPending ? (
            <Loading />
          ) : feedback.error ? (
            <p className="px-5 py-10 text-center text-sm text-(--mgr-muted)">Feedback isn't available: {feedback.error.message}</p>
          ) : latestFeedback.length ? (
            <ul className="divide-y divide-(--mgr-line)">
              {latestFeedback.map((f) => (
                <li key={f.feedback_id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={f.rating} />
                    <span className="text-xs text-(--mgr-muted)">{formatRelative(f.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm">{f.comment}</p>
                  <p className="mt-0.5 text-xs text-(--mgr-muted)">{f.customer_name ?? "Anonymous"}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-(--mgr-muted)">No feedback yet.</p>
          )}
        </Card>

        <Card className="xl:col-span-2" title="Today's staff" flush actions={<ViewAll to={managerPath("attendance")} />}>
          {employees.isPending ? (
            <Loading />
          ) : (
            <ul className="divide-y divide-(--mgr-line)">
              {scheduledToday.map((e) => {
                const shift = parseSchedule(e.work_schedule);
                const log = logs.find((l) => l.employee_id === e.employee_id);
                return (
                  <li key={e.employee_id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{fullName(e)}</p>
                      <p className="text-xs text-(--mgr-muted)">
                        {shift ? `${formatClock(shift.start)} – ${formatClock(shift.end)}` : e.work_schedule}
                      </p>
                    </div>
                    {log ? (
                      log.time_out ? (
                        <Badge tone="neutral">Left {formatTime(log.time_out)}</Badge>
                      ) : (
                        <Badge tone="success" dot>In since {formatTime(log.time_in)}</Badge>
                      )
                    ) : (
                      <Badge tone="neutral">Not clocked in</Badge>
                    )}
                  </li>
                );
              })}
              {scheduledToday.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-(--mgr-muted)">Nobody is scheduled today.</li>
              )}
            </ul>
          )}
        </Card>
      </div>

      <OrderDetailsModal
        orderId={openOrder?.order_id ?? null}
        onClose={() => setOpenOrder(null)}
        footer={
          openOrder !== null &&
          pending.some((o) => o.order_id === openOrder.order_id) && (
            <Button
              variant="primary"
              icon={FiCheck}
              disabled={completeOrder.isPending}
              onClick={() => complete(openOrder.order_id, () => setOpenOrder(null))}
            >
              Mark completed
            </Button>
          )
        }
      />
    </>
  );
}

/** The order list has no line items, so each queue row loads its own (at most six). */
function QueueItems({ orderId }: { orderId: number }) {
  const { data } = useOrder(orderId);
  return (
    <p className="mt-0.5 truncate text-xs text-(--mgr-muted)">{data ? describeItems(data.items) : "Loading items…"}</p>
  );
}

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className={buttonClass("ghost", "sm")}>
      View all <FiArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}
