import { FiAlertTriangle, FiArrowRight, FiClock, FiDatabase, FiLifeBuoy, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import Card from "../components/Card";
import BarChart from "../components/charts/BarChart";
import ChartCard from "../components/charts/ChartCard";
import LineChart from "../components/charts/LineChart";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { SERVICE_STATE, SEVERITY } from "../components/status";
import { buttonClass } from "../components/styles";
import { BACKUPS, LOGS, RESPONSE_TIME_24H, SERVICES, SIGN_INS_7D, TICKETS, USERS } from "../data/mock";
import { adminPath } from "../routes";
import { formatDateTime, formatNumber } from "../utils/format";

const ms = (v: number) => `${formatNumber(v)} ms`;

export default function Dashboard() {
  const activeUsers = USERS.filter((u) => u.status === "active").length;
  const lockedUsers = USERS.filter((u) => u.status === "locked").length;
  const openTickets = TICKETS.filter((t) => t.status === "open" || t.status === "in-progress");
  const urgentTickets = openTickets.filter((t) => t.priority === "urgent").length;
  const lastBackup = BACKUPS.find((b) => b.status === "completed");
  const unreviewedFlags = LOGS.filter((l) => l.flag && !l.flag.reviewed);
  const avgUptime = SERVICES.reduce((sum, s) => sum + s.uptime, 0) / SERVICES.length;
  const degraded = SERVICES.filter((s) => s.state !== "operational");

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="System health, access and support at a glance."
      />

      {unreviewedFlags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <FiAlertTriangle aria-hidden className="size-5 shrink-0" />
          <p className="flex-1">
            <span className="font-semibold">{unreviewedFlags.length} suspicious events</span> are waiting for review in the audit trail.
          </p>
          <Link to={`${adminPath("logs")}?view=audit`} className={buttonClass("secondary", "sm")}>
            Review now
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active accounts"
          value={formatNumber(activeUsers)}
          hint={`${lockedUsers} locked · ${USERS.length} total`}
          icon={FiUsers}
        />
        <StatCard
          label="Open tickets"
          value={openTickets.length}
          hint={urgentTickets ? `${urgentTickets} urgent` : "Nothing urgent"}
          icon={FiLifeBuoy}
        />
        <StatCard
          label="Uptime (30 days)"
          value={`${avgUptime.toFixed(2)}%`}
          hint={degraded.length ? `${degraded.length} service degraded` : "All services operational"}
          icon={FiClock}
        />
        <StatCard
          label="Last backup"
          value={lastBackup ? formatDateTime(lastBackup.created_at) : "Never"}
          hint={lastBackup ? `${lastBackup.size} · ${lastBackup.kind}` : undefined}
          icon={FiDatabase}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard
            title="API response time"
            description="Median per hour, last 24 hours"
            data={RESPONSE_TIME_24H}
            columns={["Hour", "Response time"]}
            format={ms}
          >
            <LineChart data={RESPONSE_TIME_24H} label="API response time over the last 24 hours" format={ms} />
          </ChartCard>
        </div>
        <div className="xl:col-span-2">
          <ChartCard
            title="Sign-ins"
            description="All roles, last 7 days"
            data={SIGN_INS_7D}
            columns={["Day", "Sign-ins"]}
            format={formatNumber}
          >
            <BarChart data={SIGN_INS_7D} label="Daily sign-ins over the last 7 days" format={formatNumber} />
          </ChartCard>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          className="xl:col-span-3"
          title="Recent activity"
          flush
          actions={<ViewAll to={adminPath("logs")} />}
        >
          <ul className="divide-y divide-(--admin-line)">
            {LOGS.slice(0, 6).map((log) => (
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

        <div className="flex flex-col gap-6 xl:col-span-2">
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

          <Card title="Latest tickets" flush actions={<ViewAll to={adminPath("tickets")} />}>
            <ul className="divide-y divide-(--admin-line)">
              {openTickets.slice(0, 3).map((ticket) => (
                <li key={ticket.id} className="px-5 py-3">
                  <p className="truncate text-sm font-medium">{ticket.subject}</p>
                  <p className="mt-0.5 text-xs text-(--admin-muted)">
                    {ticket.id} · {ticket.reporter} · {ticket.kind === "bug" ? "Bug report" : "Complaint"}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className={buttonClass("ghost", "sm")}>
      View all <FiArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}
