import type { ReactNode } from "react";
import { FiAlertTriangle, FiArrowRight, FiClock, FiDatabase, FiLifeBuoy, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";
import { errorMessage } from "../../lib/api";
import { useActivity, useSignIns } from "../api/activity";
import { useAdminUsers } from "../api/users";
import Badge from "../components/Badge";
import Card from "../components/Card";
import BarChart from "../components/charts/BarChart";
import ChartCard from "../components/charts/ChartCard";
import LineChart from "../components/charts/LineChart";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading } from "../components/QueryState";
import StatCard from "../components/StatCard";
import { SERVICE_STATE, SEVERITY } from "../components/status";
import { buttonClass } from "../components/styles";
import { BACKUPS, RESPONSE_TIME_24H, SERVICES, TICKETS } from "../data/mock";
import { adminPath } from "../routes";
import type { SeriesPoint } from "../types";
import { formatDateTime, formatNumber } from "../utils/format";

const ms = (v: number) => `${formatNumber(v)} ms`;
const WEEKDAY = new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" });

/**
 * Built in the browser from the same hooks the other pages use. Each card
 * loads (and fails) on its own, so one unavailable source never blanks the page.
 */
export default function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" description="System health, access and support at a glance." />

      <SuspiciousBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AccountsStat />
        <TicketsStat />
        <UptimeStat />
        <BackupStat />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ResponseTimeChart />
        </div>
        <div className="xl:col-span-2">
          <SignInsChart />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <RecentActivity />
        <div className="flex flex-col gap-6 xl:col-span-2">
          <ServicesCard />
          <LatestTickets />
        </div>
      </div>
    </>
  );
}

/** A StatCard's value while its query is loading or failed. */
function statValue<T>(query: { isPending: boolean; isError: boolean; data: T | undefined }, show: (data: T) => ReactNode) {
  if (query.isPending) return "…";
  if (query.isError || query.data === undefined) return "—";
  return show(query.data);
}

function SuspiciousBanner() {
  const activity = useActivity({}, { limit: 6 });
  const unreviewed = activity.data?.pages[0]?.unreviewed ?? 0;
  if (unreviewed === 0) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-amber-200">
      <FiAlertTriangle aria-hidden className="size-5 shrink-0" />
      <p className="flex-1">
        <span className="font-semibold">
          {unreviewed} suspicious event{unreviewed === 1 ? "" : "s"}
        </span>{" "}
        {unreviewed === 1 ? "is" : "are"} waiting for review in the audit trail.
      </p>
      <Link to={`${adminPath("logs")}?view=audit`} className={buttonClass("secondary", "sm")}>
        Review now
      </Link>
    </div>
  );
}

function AccountsStat() {
  const users = useAdminUsers();
  const list = users.data ?? [];
  return (
    <StatCard
      label="Active accounts"
      value={statValue(users, (data) => formatNumber(data.filter((u) => u.status === "active").length))}
      hint={
        users.isError
          ? errorMessage(users.error)
          : users.data && `${list.filter((u) => u.status === "locked").length} locked · ${list.length} total`
      }
      icon={FiUsers}
    />
  );
}

function TicketsStat() {
  const open = TICKETS.filter((t) => t.status === "open" || t.status === "in-progress");
  const urgent = open.filter((t) => t.priority === "urgent").length;
  return (
    <StatCard
      label="Open tickets"
      value={open.length}
      hint={urgent ? `${urgent} urgent` : "Nothing urgent"}
      icon={FiLifeBuoy}
    />
  );
}

function UptimeStat() {
  const avgUptime = SERVICES.reduce((sum, s) => sum + s.uptime, 0) / SERVICES.length;
  const degraded = SERVICES.filter((s) => s.state !== "operational");
  return (
    <StatCard
      label="Uptime (30 days)"
      value={`${avgUptime.toFixed(2)}%`}
      hint={degraded.length ? `${degraded.length} service degraded` : "All services operational"}
      icon={FiClock}
    />
  );
}

function BackupStat() {
  const lastBackup = BACKUPS.find((b) => b.status === "completed");
  return (
    <StatCard
      label="Last backup"
      value={lastBackup ? formatDateTime(lastBackup.created_at) : "Never"}
      hint={lastBackup ? `${lastBackup.size} · ${lastBackup.kind}` : undefined}
      icon={FiDatabase}
    />
  );
}

function ResponseTimeChart() {
  return (
    <ChartCard
      title="API response time"
      description="Average per hour, last 24 hours"
      data={RESPONSE_TIME_24H}
      columns={["Hour", "Response time"]}
      format={ms}
    >
      <LineChart data={RESPONSE_TIME_24H} label="API response time over the last 24 hours" format={ms} />
    </ChartCard>
  );
}

function SignInsChart() {
  const signIns = useSignIns(7);
  const data: SeriesPoint[] = (signIns.data ?? []).map((d) => ({
    label: WEEKDAY.format(new Date(`${d.day}T00:00:00Z`)),
    value: d.count,
  }));
  if (!signIns.isSuccess) {
    return (
      <Card title="Sign-ins" description="All roles, last 7 days">
        {signIns.isPending ? (
          <Loading />
        ) : (
          <ErrorNotice error={signIns.error} onRetry={() => void signIns.refetch()} />
        )}
      </Card>
    );
  }
  return (
    <ChartCard
      title="Sign-ins"
      description="All roles, last 7 days"
      data={data}
      columns={["Day", "Sign-ins"]}
      format={formatNumber}
    >
      <BarChart data={data} label="Daily sign-ins over the last 7 days" format={formatNumber} />
    </ChartCard>
  );
}

function RecentActivity() {
  const activity = useActivity({}, { limit: 6 });
  const logs = activity.data?.pages[0]?.entries ?? [];
  return (
    <Card className="xl:col-span-3" title="Recent activity" flush actions={<ViewAll to={adminPath("logs")} />}>
      {activity.isPending && <Loading />}
      {activity.isError && (
        <div className="p-4">
          <ErrorNotice error={activity.error} onRetry={() => void activity.refetch()} />
        </div>
      )}
      {activity.isSuccess && logs.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-(--admin-muted)">Nothing has happened yet.</p>
      )}
      <ul className="divide-y divide-(--admin-line)">
        {logs.map((log) => (
          <li key={log.id} className="flex items-start gap-3 px-5 py-3">
            {/* Fixed column so the event text lines up whatever the badge says. */}
            <span className="w-20 shrink-0">
              <Badge tone={SEVERITY[log.severity].tone} dot>
                {SEVERITY[log.severity].label}
              </Badge>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{log.action}</p>
              <p className="mt-0.5 text-xs text-(--admin-muted)">
                {log.actor} · {log.module} · {formatDateTime(log.timestamp)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ServicesCard() {
  return (
    <Card title="Services" flush actions={<ViewAll to={adminPath("health")} />}>
      <ul className="divide-y divide-(--admin-line)">
        {SERVICES.map((service) => (
          <li key={service.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
            <span>{service.name}</span>
            <Badge tone={SERVICE_STATE[service.state].tone} dot>
              {SERVICE_STATE[service.state].label}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LatestTickets() {
  const open = TICKETS.filter((t) => t.status === "open" || t.status === "in-progress");
  return (
    <Card title="Latest tickets" flush actions={<ViewAll to={adminPath("tickets")} />}>
      <ul className="divide-y divide-(--admin-line)">
        {open.slice(0, 3).map((ticket) => (
          <li key={ticket.id} className="px-5 py-3">
            <p className="truncate text-sm font-medium">{ticket.subject}</p>
            <p className="mt-0.5 text-xs text-(--admin-muted)">
              {ticket.id} · {ticket.reporter} · {ticket.kind === "bug" ? "Bug report" : "Complaint"}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className={buttonClass("ghost", "sm")}>
      View all <FiArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}
