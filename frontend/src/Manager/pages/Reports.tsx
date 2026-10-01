import { useMemo, useState } from "react";
import { FiDollarSign, FiDownload, FiShoppingBag, FiTag, FiXCircle } from "react-icons/fi";
import { useCategories, useProducts } from "../api/catalog";
import { useOrders } from "../api/orders";
import { useExportSales, useSalesReport } from "../api/reports";
import Button from "../components/Button";
import Card from "../components/Card";
import BarChart from "../components/charts/BarChart";
import ChartCard from "../components/charts/ChartCard";
import LineChart from "../components/charts/LineChart";
import { Input } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading, LoadingRow, Spinner } from "../components/QueryState";
import StatCard from "../components/StatCard";
import { PAYMENT_METHOD_LABELS } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useNotifyError } from "../components/toastContext";
import { STORE_HOURS } from "../data/selectors";
import type { ReportPeriod, SalesReport, SeriesPoint } from "../types";
import { groupBy, indexBy, sumBy } from "../utils/collections";
import { downloadCsv } from "../utils/csv";
import { addDays, dayKey, daysInMonth, fromDayKey, monthKey } from "../utils/dates";
import { formatChange, formatHourShort, formatMonth, formatNumber, formatPeso, formatPesoWhole, round2 } from "../utils/format";

function previousMonth(key: string): string {
  const d = fromDayKey(`${key}-01`);
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}

/** Series labels are "07:00" (hour) for daily reports and "07" (day) for monthly ones. */
const bucketOf = (point: SeriesPoint): number => parseInt(point.label, 10);

/** Net sales up to `cutoff` (an hour or a day of the month), for like-for-like comparisons. */
function netUpTo(report: SalesReport, cutoff: number): number {
  return round2(sumBy(report.series.filter((p) => bucketOf(p) <= cutoff), (p) => p.value));
}

export default function Reports() {
  const notifyError = useNotifyError();
  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [day, setDay] = useState(dayKey(now));
  const [month, setMonth] = useState(monthKey(now));

  const daily = period === "daily";
  const date = daily ? day : `${month}-01`;
  const previousDate = daily ? dayKey(addDays(fromDayKey(day), -1)) : `${previousMonth(month)}-01`;
  const inProgress = daily ? day === dayKey(now) : month === monthKey(now);
  const range = daily
    ? { from: day, to: day }
    : { from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, "0")}` };

  const report = useSalesReport(period, date);
  const previous = useSalesReport(period, previousDate);
  const completed = useOrders({ status: "completed", ...range });
  const cancelled = useOrders({ status: "cancelled", ...range });
  const products = useProducts();
  const categories = useCategories();
  const exportSales = useExportSales();

  const productById = useMemo(() => indexBy(products.data ?? [], (p) => p.product_id), [products.data]);
  const categoryById = useMemo(() => indexBy(categories.data ?? [], (c) => c.category_id), [categories.data]);

  const summary = report.data?.summary;
  const net = summary?.net_sales ?? 0;
  // An unfinished day or month is compared with the same point in the previous one.
  const previousNet = previous.data
    ? inProgress
      ? netUpTo(previous.data, daily ? now.getHours() : now.getDate())
      : previous.data.summary.net_sales
    : 0;
  const netChange = formatChange(net, previousNet);
  const compareTo = daily
    ? inProgress
      ? "vs same time yesterday"
      : "vs previous day"
    : inProgress
      ? "vs same point last month"
      : "vs previous month";

  const series: SeriesPoint[] = (report.data?.series ?? [])
    .filter((p) => !daily || STORE_HOURS.includes(bucketOf(p)) || p.value > 0)
    .map((p) => ({ label: daily ? formatHourShort(bucketOf(p)) : String(bucketOf(p)), value: p.value }));

  const payments = report.data?.payment_methods ?? [];
  const paymentTotal = sumBy(payments, (p) => p.amount);
  const topProducts = report.data?.top_products ?? [];
  const cancelledOrders = cancelled.data ?? [];
  const cashiers = [...groupBy(completed.data ?? [], (o) => o.employee_id)]
    .map(([employeeId, rows]) => ({
      employeeId,
      name: rows[0]!.employee_name,
      orders: rows.length,
      net: round2(sumBy(rows, (o) => o.total_amount)),
    }))
    .sort((a, b) => b.net - a.net);

  const label = daily
    ? fromDayKey(day).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : formatMonth(fromDayKey(`${month}-01`));
  const fileKey = daily ? day : month;
  const chartTitle = daily ? "Net sales by hour" : "Net sales by day";
  const dash = (value: string | number) => (summary ? value : "—");

  const exportProducts = () =>
    downloadCsv(
      `top-products-${fileKey}.csv`,
      topProducts.map((p) => ({
        product: p.product_name,
        category: categoryById.get(productById.get(p.product_id)?.category_id ?? 0)?.category_name ?? "",
        units_sold: p.units_sold,
        revenue: p.revenue,
      })),
    );

  return (
    <>
      <PageHeader
        title="Sales reports"
        description={`${daily ? "Daily" : "Monthly"} report for ${label}. Only completed orders count toward sales.`}
        actions={
          <Button
            icon={FiDownload}
            disabled={!summary?.order_count || exportSales.isPending}
            onClick={() => exportSales.mutate({ period, date }, { onError: notifyError })}
          >
            {exportSales.isPending ? "Exporting…" : "Export orders"}
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          label="Report period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "daily", label: "Daily" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        {daily ? (
          <Input
            type="date"
            aria-label="Report day"
            value={day}
            max={dayKey(now)}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            className="sm:w-44"
          />
        ) : (
          <Input
            type="month"
            aria-label="Report month"
            value={month}
            max={monthKey(now)}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="sm:w-44"
          />
        )}
        {report.isPlaceholderData ? (
          <span className="flex items-center gap-2 text-xs text-(--mgr-muted)">
            <Spinner className="size-3" /> Updating…
          </span>
        ) : (
          inProgress && <span className="text-xs text-(--mgr-muted)">In progress: figures update as orders are completed.</span>
        )}
      </div>

      {report.error && (
        <ErrorNotice className="mb-6" title="Couldn't load the report" error={report.error} onRetry={() => void report.refetch()} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Net sales"
          value={dash(formatPeso(net))}
          hint={netChange ? `${netChange} ${compareTo}` : "Nothing to compare against"}
          icon={FiDollarSign}
        />
        <StatCard
          label="Orders"
          value={dash(formatNumber(summary?.order_count ?? 0))}
          hint={`${formatPeso(summary?.order_count ? net / summary.order_count : 0)} average order`}
          icon={FiShoppingBag}
        />
        <StatCard
          label="Discounts given"
          value={dash(formatPeso(summary?.discounts ?? 0))}
          hint={`${formatPeso(summary?.gross_sales ?? 0)} gross before discounts`}
          icon={FiTag}
        />
        <StatCard
          label="Cancelled"
          value={cancelled.isPending ? "—" : cancelledOrders.length}
          hint={`${formatPeso(sumBy(cancelledOrders, (o) => o.total_amount))} not collected`}
          icon={FiXCircle}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard
            title={chartTitle}
            description={label}
            data={series}
            columns={[daily ? "Hour" : "Day", "Net sales"]}
            format={formatPesoWhole}
          >
            {report.isPending ? (
              <Loading />
            ) : daily ? (
              <BarChart data={series} label={`${chartTitle}, ${label}`} format={formatPesoWhole} />
            ) : (
              <LineChart data={series} label={`${chartTitle}, ${label}`} format={formatPesoWhole} xLabelEvery={5} />
            )}
          </ChartCard>
        </div>

        <Card className="xl:col-span-2" title="Payment methods" description="Collected on completed orders">
          {report.isPending ? (
            <Loading />
          ) : payments.length ? (
            <ul className="space-y-4">
              {payments.map((p) => (
                <ShareRow
                  key={p.payment_method}
                  label={PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}
                  value={formatPeso(p.amount)}
                  share={paymentTotal ? p.amount / paymentTotal : 0}
                />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-(--mgr-muted)">No payments in this period.</p>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          className="xl:col-span-3"
          title="Top products"
          description="Best sellers by units, line totals before order discounts"
          flush
          actions={
            <Button size="sm" variant="ghost" icon={FiDownload} onClick={exportProducts} disabled={topProducts.length === 0}>
              CSV
            </Button>
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Product</Th>
                <Th className="text-right">Sold</Th>
                <Th className="text-right">Revenue</Th>
              </tr>
            </thead>
            <tbody>
              {report.isPending && <LoadingRow colSpan={4} />}
              {topProducts.map((p, i) => (
                <tr key={p.product_id}>
                  <Td className="text-(--mgr-muted) tabular-nums">{i + 1}</Td>
                  <Td>
                    <p className="font-medium">{p.product_name}</p>
                    <p className="text-xs text-(--mgr-muted)">
                      {categoryById.get(productById.get(p.product_id)?.category_id ?? 0)?.category_name}
                    </p>
                  </Td>
                  <Td className="text-right tabular-nums">{formatNumber(p.units_sold)}</Td>
                  <Td className="text-right tabular-nums">{formatPeso(p.revenue)}</Td>
                </tr>
              ))}
              {report.isSuccess && topProducts.length === 0 && <EmptyRow colSpan={4}>No sales in this period.</EmptyRow>}
            </tbody>
          </Table>
        </Card>

        <Card className="xl:col-span-2" title="Sales by cashier" description="Completed orders they handled" flush>
          {completed.isPending ? (
            <Loading />
          ) : (
            <ul className="divide-y divide-(--mgr-line)">
              {cashiers.map((c) => (
                <li key={c.employeeId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-(--mgr-muted)">{formatNumber(c.orders)} orders</p>
                  </div>
                  <span className="tabular-nums">{formatPeso(c.net)}</span>
                </li>
              ))}
              {cashiers.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-(--mgr-muted)">No sales in this period.</li>
              )}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

interface ShareRowProps {
  label: string;
  value: string;
  /** 0 to 1. */
  share: number;
}

function ShareRow({ label, value, share }: ShareRowProps) {
  const pct = Math.round(share * 100);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-(--mgr-grid)" aria-hidden>
        <div className="h-full rounded-full bg-(--mgr-chart)" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-(--mgr-muted)">{pct}% of collections</p>
    </li>
  );
}
