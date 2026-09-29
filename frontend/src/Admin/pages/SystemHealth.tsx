import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FiActivity, FiAlertTriangle, FiClock, FiCpu, FiPlay, FiRefreshCw, FiSearch, FiTrash2, FiZap } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import ChartCard from "../components/charts/ChartCard";
import LineChart from "../components/charts/LineChart";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { SERVICE_STATE } from "../components/status";
import { Table, Td, Th } from "../components/Table";
import { useToast } from "../components/toastContext";
import { RESOURCES, RESPONSE_TIME_24H, SERVICES } from "../data/mock";
import type { ServiceStatus } from "../types";
import { formatNumber } from "../utils/format";

const ms = (v: number) => `${formatNumber(v)} ms`;

interface Tool {
  id: string;
  label: string;
  description: string;
  icon: IconType;
  output: string[];
}

/** Simulated troubleshooting runs; each line prints a beat after the last. */
const TOOLS: Tool[] = [
  {
    id: "diagnostics",
    label: "Run diagnostics",
    description: "Checks every service, the database and third-party APIs.",
    icon: FiSearch,
    output: [
      "Pinging API server… ok (88 ms)",
      "Checking database connection pool… ok (22/100 in use)",
      "Verifying Clerk JWKS… ok",
      "Calling GCash status endpoint… slow (1,840 ms)",
      "Webhook queue: 3 events pending retry",
      "Done. 1 warning: payment webhooks are degraded.",
    ],
  },
  {
    id: "cache",
    label: "Clear application cache",
    description: "Flushes cached menu, pricing and session data.",
    icon: FiTrash2,
    output: ["Flushing menu cache… 214 keys", "Flushing pricing cache… 88 keys", "Cache cleared."],
  },
  {
    id: "webhooks",
    label: "Retry failed webhooks",
    description: "Re-sends payment events that didn't get a response.",
    icon: FiZap,
    output: ["Retrying 3 GCash events…", "evt_9F2a… delivered", "evt_9F2b… delivered", "evt_9F2c… delivered", "All webhooks delivered."],
  },
];

const LINE_DELAY_MS = 450;

export default function SystemHealth() {
  const notify = useToast();
  const [services, setServices] = useState<ServiceStatus[]>(SERVICES);
  const [consoleLines, setConsole] = useState<string[]>(["Ready. Choose a tool to run."]);
  const [running, setRunning] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const consoleRef = useRef<HTMLPreElement>(null);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight });
  }, [consoleLines]);

  const later = (fn: () => void, delay: number) => {
    timers.current.push(window.setTimeout(fn, delay));
  };

  const restart = (service: ServiceStatus) => {
    setServices((current) => current.map((s) => (s.id === service.id ? { ...s, state: "restarting" } : s)));
    notify(`Restarting ${service.name}…`, "info");
    later(() => {
      setServices((current) =>
        current.map((s) =>
          s.id === service.id ? { ...s, state: "operational", latency_ms: Math.min(s.latency_ms, 240) } : s,
        ),
      );
      notify(`${service.name} is back up.`);
    }, 2500);
  };

  const runTool = (tool: Tool) => {
    setRunning(tool.id);
    setConsole((current) => [...current, "", `$ ${tool.label.toLowerCase()}`]);
    tool.output.forEach((line, i) => {
      later(() => {
        setConsole((current) => [...current, line]);
        if (i === tool.output.length - 1) setRunning(null);
      }, LINE_DELAY_MS * (i + 1));
    });
  };

  const avgUptime = services.reduce((sum, s) => sum + s.uptime, 0) / services.length;
  const issues = services.filter((s) => s.state === "degraded" || s.state === "down");

  return (
    <>
      <PageHeader
        title="System Health"
        description="Monitor performance and uptime, and troubleshoot when something goes wrong."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Uptime (30 days)" value={`${avgUptime.toFixed(2)}%`} hint="Average across services" icon={FiClock} />
        <StatCard label="Avg response" value={ms(Math.round(RESPONSE_TIME_24H.reduce((s, p) => s + p.value, 0) / RESPONSE_TIME_24H.length))} hint="Last 24 hours" icon={FiActivity} />
        <StatCard label="Error rate" value="0.42%" hint="5xx responses, last hour" icon={FiAlertTriangle} />
        <StatCard label="Active sessions" value="186" hint="Across all branches" icon={FiCpu} />
      </div>

      {issues.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <FiAlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p>
            <span className="font-semibold">{issues.map((s) => s.name).join(", ")}</span>{" "}
            {issues.length === 1 ? "is" : "are"} not fully operational. Run diagnostics below or restart the service.
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
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

        <Card title="Server resources" description="Production host, live">
          <ul className="flex flex-col gap-5">
            {RESOURCES.map((r) => {
              const level = r.value >= 85 ? "critical" : r.value >= 70 ? "high" : null;
              const tone = level === "critical" ? "bg-red-600" : level === "high" ? "bg-amber-600" : "bg-(--admin-chart)";
              return (
                <li key={r.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      {r.label}
                      {level && (
                        <Badge tone={level === "critical" ? "danger" : "warning"}>
                          {level === "critical" ? "Critical" : "High"}
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs text-(--admin-muted)">
                      <span className="font-semibold text-(--admin-ink) tabular-nums">{r.value}%</span> · {r.detail}
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={r.label}
                    aria-valuenow={r.value}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-2 h-2 overflow-hidden rounded-full bg-(--admin-grid)"
                  >
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${r.value}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <Card flush title="Services" description="Status, latency and 30-day uptime per service">
          <Table>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Status</Th>
                <Th className="text-right">Latency</Th>
                <Th className="text-right">Uptime</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <Td>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-(--admin-muted)">{service.description}</p>
                  </Td>
                  <Td>
                    <Badge tone={SERVICE_STATE[service.state].tone} dot>{SERVICE_STATE[service.state].label}</Badge>
                  </Td>
                  <Td className={`text-right tabular-nums ${service.latency_ms > 1000 ? "font-semibold text-amber-800" : ""}`}>
                    {ms(service.latency_ms)}
                  </Td>
                  <Td className="text-right tabular-nums">{service.uptime.toFixed(2)}%</Td>
                  <Td className="text-right">
                    <Button
                      size="sm"
                      icon={FiRefreshCw}
                      disabled={service.state === "restarting"}
                      onClick={() => restart(service)}
                    >
                      Restart
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2" title="Troubleshoot" description="Quick fixes for common problems">
          <ul className="flex flex-col gap-3">
            {TOOLS.map((tool) => (
              <li key={tool.id} className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-(--admin-line)">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--admin-gold)/15">
                  <tool.icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{tool.label}</p>
                  <p className="text-xs text-(--admin-muted)">{tool.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  icon={FiPlay}
                  disabled={running !== null}
                  aria-label={`Run: ${tool.label}`}
                  onClick={() => runTool(tool)}
                >
                  Run
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          className="lg:col-span-3"
          title="Console"
          description={running ? "Running…" : "Output from troubleshooting tools"}
          actions={
            <Button size="sm" variant="ghost" disabled={running !== null} onClick={() => setConsole(["Console cleared."])}>
              Clear
            </Button>
          }
        >
          <pre
            ref={consoleRef}
            aria-live="polite"
            className="h-64 overflow-y-auto rounded-xl bg-(--admin-ink) p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-(--admin-cream)"
          >
            {consoleLines.join("\n")}
          </pre>
        </Card>
      </div>
    </>
  );
}
