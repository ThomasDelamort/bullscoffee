import { useEffect, useRef, useState } from "react";
import { FiActivity, FiAlertTriangle, FiClock, FiPlay, FiSearch, FiUsers } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import { averageUptime, responseSeries, useRunDiagnostics, useSystemHealth } from "../api/health";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import ChartCard from "../components/charts/ChartCard";
import LineChart from "../components/charts/LineChart";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading } from "../components/QueryState";
import StatCard from "../components/StatCard";
import { SERVICE_STATE } from "../components/status";
import { Table, Td, Th } from "../components/Table";
import type { HealthReport, Resource } from "../types";
import { formatDateTime, formatNumber } from "../utils/format";

const ms = (v: number) => `${formatNumber(v)} ms`;

export default function SystemHealth() {
  const health = useSystemHealth();

  return (
    <>
      <PageHeader
        title="System Health"
        description="Live status of the services the store runs on. Checked every minute; this page refreshes every 30 seconds."
      />
      {health.isPending && <Loading label="Checking services…" />}
      {health.isError && (
        <ErrorNotice title="Couldn't read system health" error={health.error} onRetry={() => void health.refetch()} />
      )}
      {health.data && <Report report={health.data} />}
      <Diagnostics />
    </>
  );
}

function Report({ report }: { report: HealthReport }) {
  const uptime = averageUptime(report);
  const series = responseSeries(report);
  const withTraffic = report.response_time_24h.filter((h) => h.avg_ms !== null);
  const avgResponse = withTraffic.length
    ? Math.round(withTraffic.reduce((sum, h) => sum + (h.avg_ms ?? 0), 0) / withTraffic.length)
    : null;
  const issues = report.services.filter((s) => s.state === "degraded" || s.state === "down");

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Uptime (30 days)"
          value={uptime === null ? "—" : `${uptime.toFixed(2)}%`}
          hint="Average across services"
          icon={FiClock}
        />
        <StatCard
          label="Avg response"
          value={avgResponse === null ? "—" : ms(avgResponse)}
          hint="Last 24 hours"
          icon={FiActivity}
        />
        <StatCard
          label="Error rate"
          value={`${report.error_rate_1h}%`}
          hint={`5xx responses, last hour (${formatNumber(report.requests_1h)} requests)`}
          icon={FiAlertTriangle}
        />
        <StatCard
          label="Active sessions"
          value={formatNumber(report.active_sessions)}
          hint="Signed in, last 15 min"
          icon={FiUsers}
        />
      </div>

      {issues.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <FiAlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p>
            <span className="font-semibold">{issues.map((s) => s.name).join(", ")}</span>{" "}
            {issues.length === 1 ? "is" : "are"} not fully operational. Run diagnostics below for details.
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard
            title="API response time"
            description="Average per hour, last 24 hours (store time)"
            data={series}
            columns={["Hour", "Response time"]}
            format={ms}
          >
            <LineChart data={series} label="API response time over the last 24 hours" format={ms} />
          </ChartCard>
        </div>

        <Card title="Server resources" description="The API's host, live">
          <ul className="flex flex-col gap-5">
            {report.resources.map((r) => (
              <ResourceMeter key={r.label} resource={r} />
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <Card flush title="Services" description="Latest check, and 30-day uptime per service">
          <Table>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Status</Th>
                <Th className="text-right">Latency</Th>
                <Th className="text-right">Uptime</Th>
                <Th>Last check</Th>
              </tr>
            </thead>
            <tbody>
              {report.services.map((service) => (
                <tr key={service.id}>
                  <Td>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-(--admin-muted)">{service.description}</p>
                  </Td>
                  <Td wrap>
                    <Badge tone={SERVICE_STATE[service.state].tone} dot>{SERVICE_STATE[service.state].label}</Badge>
                    {service.detail && <p className="mt-1 text-xs text-(--admin-muted)">{service.detail}</p>}
                  </Td>
                  <Td
                    className={`text-right tabular-nums ${service.latency_ms !== null && service.latency_ms > 1000 ? "font-semibold text-amber-800" : ""}`}
                  >
                    {service.latency_ms === null ? "—" : ms(service.latency_ms)}
                  </Td>
                  <Td className="text-right tabular-nums">{service.uptime === null ? "—" : `${service.uptime.toFixed(2)}%`}</Td>
                  <Td className="text-(--admin-muted)">{service.checked_at ? formatDateTime(service.checked_at) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}

function ResourceMeter({ resource: r }: { resource: Resource }) {
  const value = r.percent ?? 0;
  const level = r.percent === null ? null : value >= 85 ? "critical" : value >= 70 ? "high" : null;
  const tone = level === "critical" ? "bg-red-600" : level === "high" ? "bg-amber-600" : "bg-(--admin-chart)";
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          {r.label}
          {level && <Badge tone={level === "critical" ? "danger" : "warning"}>{level === "critical" ? "Critical" : "High"}</Badge>}
        </span>
        <span className="text-right text-xs text-(--admin-muted)">
          <span className="font-semibold text-(--admin-ink) tabular-nums">{r.percent === null ? "n/a" : `${value}%`}</span> ·{" "}
          {r.detail}
        </span>
      </div>
      <div
        role="meter"
        aria-label={r.label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-2 overflow-hidden rounded-full bg-(--admin-grid)"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </li>
  );
}

function Diagnostics() {
  const diagnostics = useRunDiagnostics();
  const [lines, setLines] = useState<string[]>(["Ready. Run diagnostics to probe every service now."]);
  const consoleRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight });
  }, [lines]);

  const run = () => {
    setLines((current) => [...current, "", "$ run diagnostics"]);
    diagnostics.mutate(undefined, {
      onSuccess: (output) => setLines((current) => [...current, ...output]),
      onError: (error) => setLines((current) => [...current, `Failed: ${errorMessage(error)}`]),
    });
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2" title="Troubleshoot" description="Check everything now, instead of waiting for the next minute">
        <div className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-(--admin-line)">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--admin-gold)/15">
            <FiSearch aria-hidden className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Run diagnostics</p>
            <p className="text-xs text-(--admin-muted)">
              Probes the database, Clerk, S3, PayMongo and email, and prints what each answered.
            </p>
          </div>
          <Button size="sm" variant="primary" icon={FiPlay} disabled={diagnostics.isPending} onClick={run}>
            Run
          </Button>
        </div>
      </Card>

      <Card
        className="lg:col-span-3"
        title="Console"
        description={diagnostics.isPending ? "Running…" : "Diagnostics output"}
        actions={
          <Button size="sm" variant="ghost" disabled={diagnostics.isPending} onClick={() => setLines(["Console cleared."])}>
            Clear
          </Button>
        }
      >
        <pre
          ref={consoleRef}
          aria-live="polite"
          className="h-64 overflow-y-auto rounded-xl bg-(--admin-ink) p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-(--admin-cream)"
        >
          {lines.join("\n")}
        </pre>
      </Card>
    </div>
  );
}
