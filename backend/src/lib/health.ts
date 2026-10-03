import fs from "node:fs/promises";
import os from "node:os";
import { clerkClient } from "@clerk/express";
import { pool } from "./db.ts";
import { isEmailConfigured } from "./notify.ts";
import { isPaymongoConfigured, paymongoRequest } from "./paymongo.ts";
import { headFile, isS3Configured, storePrivateObject } from "./s3.ts";
import { registerJob } from "./scheduler.ts";
import { activeSessionCount, takeFinishedMinutes } from "../middleware/requestMetrics.middleware.ts";

// System Health: each scheduler tick probes the services the API depends on
// and stores the result in health_checks; the page reads the latest result,
// 30-day uptime and request_metrics. Caveats, by design:
//  - Counters (requests, active sessions) are per process and reset on restart.
//  - A sleeping Render free instance runs no probes, which leaves gaps in the
//    history; uptime is the share of checks that were up, so gaps don't count
//    against it.

export type ServiceState = "operational" | "degraded" | "down" | "not_configured";
export type ServiceId = "api" | "database" | "auth" | "storage" | "payments" | "email";

export interface ProbeResult {
  service: ServiceId;
  state: ServiceState;
  latency_ms: number | null;
  detail: string;
}

const SERVICES: Record<ServiceId, { name: string; description: string }> = {
  api: { name: "API server", description: "Express backend" },
  database: { name: "Database", description: "PostgreSQL" },
  auth: { name: "Authentication", description: "Clerk sign-in" },
  storage: { name: "File storage", description: "Amazon S3: images, documents, backups" },
  payments: { name: "Payments", description: "PayMongo online checkout" },
  email: { name: "Email", description: "Resend: order and support emails" },
};

const PROBE_TIMEOUT_MS = 8_000;
const PRUNE_AFTER_DAYS = 30;

// Slower than this, a service is degraded rather than operational.
const SLOW_MS: Record<ServiceId, number> = {
  api: 1_000,
  database: 500,
  auth: 2_000,
  storage: 2_000,
  payments: 3_000,
  email: 5_000,
};

const timeout = <T>(work: Promise<T>): Promise<T> =>
  Promise.race([
    work,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), PROBE_TIMEOUT_MS)),
  ]);

// Times `work`; a throw is down, a slow answer degraded.
async function timed(
  service: ServiceId,
  work: () => Promise<string>,
): Promise<ProbeResult> {
  const started = performance.now();
  try {
    const detail = await timeout(work());
    const latency_ms = Math.round(performance.now() - started);
    return {
      service,
      state: latency_ms > SLOW_MS[service] ? "degraded" : "operational",
      latency_ms,
      detail: latency_ms > SLOW_MS[service] ? `${detail}; slow` : detail,
    };
  } catch (error: any) {
    return {
      service,
      state: "down",
      latency_ms: Math.round(performance.now() - started),
      detail: error?.message ?? "failed",
    };
  }
}

const poolMax = (): number => (pool as unknown as { options: { max?: number } }).options.max ?? 10;

const probeDatabase = () =>
  timed("database", async () => {
    await pool.query("SELECT 1");
    return `pool ${pool.totalCount - pool.idleCount}/${poolMax()} in use, ${pool.waitingCount} waiting`;
  });

const probeAuth = () =>
  timed("auth", async () => {
    const users = await clerkClient.users.getCount();
    return `${users} accounts`;
  });

// A small private object written at boot; HEAD on it proves the app can
// still reach the bucket with its credentials.
const PROBE_FILE = "probe.txt";
let probeKey: string | null = null;

async function ensureProbeObject(): Promise<string> {
  probeKey ??= await storePrivateObject("health", PROBE_FILE, "Bull's Coffee storage probe\n", "text/plain");
  return probeKey;
}

const probeStorage = async (): Promise<ProbeResult> => {
  if (!isS3Configured()) {
    return { service: "storage", state: "not_configured", latency_ms: null, detail: "AWS_S3_BUCKET / AWS_REGION not set" };
  }
  return timed("storage", async () => {
    await headFile(await ensureProbeObject());
    return "bucket reachable";
  });
};

const probePayments = async (): Promise<ProbeResult> => {
  if (!isPaymongoConfigured()) {
    return { service: "payments", state: "not_configured", latency_ms: null, detail: "PayMongo keys not set" };
  }
  return timed("payments", async () => {
    await paymongoRequest("GET", "/webhooks");
    return "PayMongo API reachable";
  });
};

// No network probe (that would send email): the state comes from what the
// latest sends did. Any failure in the last hour is degraded; the last
// three sends all failing is down.
async function probeEmail(): Promise<ProbeResult> {
  if (!isEmailConfigured()) {
    return { service: "email", state: "not_configured", latency_ms: null, detail: "RESEND_API_KEY / NOTIFY_FROM not set" };
  }
  const result = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM notification_log WHERE status = 'failed' AND sent_at > now() - interval '1 hour') AS failed_hour,
      (SELECT array_agg(status::text) FROM (
        SELECT status FROM notification_log WHERE status <> 'skipped' ORDER BY log_id DESC LIMIT 3
      ) recent) AS recent,
      (SELECT round(avg(latency_ms))::int FROM notification_log WHERE status = 'sent' AND sent_at > now() - interval '1 day') AS latency
  `);
  const { failed_hour, recent, latency } = result.rows[0];
  const statuses: string[] = recent ?? [];
  if (statuses.length === 3 && statuses.every((s) => s === "failed")) {
    return { service: "email", state: "down", latency_ms: latency, detail: "The last 3 emails failed" };
  }
  if (failed_hour > 0) {
    return { service: "email", state: "degraded", latency_ms: latency, detail: `${failed_hour} failed in the last hour` };
  }
  return { service: "email", state: "operational", latency_ms: latency, detail: "Recent emails sent" };
}

// The API answered this request, so it's up; its latency is the average
// response time over the last 15 minutes.
async function probeApi(): Promise<ProbeResult> {
  const result = await pool.query(`
    SELECT CASE WHEN sum(requests) > 0 THEN round(sum(total_ms)::numeric / sum(requests))::int END AS avg_ms,
           COALESCE(sum(requests), 0)::int AS requests
    FROM request_metrics WHERE minute > now() - interval '15 minutes'
  `);
  const { avg_ms, requests } = result.rows[0];
  return {
    service: "api",
    state: avg_ms !== null && avg_ms > SLOW_MS.api ? "degraded" : "operational",
    latency_ms: avg_ms,
    detail: `${requests} requests in the last 15 min`,
  };
}

/** Every probe, now. Payments is skipped unless asked for: it calls PayMongo. */
export async function runProbes({ payments }: { payments: boolean }): Promise<ProbeResult[]> {
  return Promise.all([
    probeApi(),
    probeDatabase(),
    probeAuth(),
    probeStorage(),
    ...(payments ? [probePayments()] : []),
    probeEmail(),
  ]);
}

async function storeProbes(results: ProbeResult[]): Promise<void> {
  await pool.query(
    `
      INSERT INTO health_checks (service, state, latency_ms, detail)
      SELECT * FROM unnest($1::varchar[], $2::varchar[], $3::int[], $4::text[])
    `,
    [
      results.map((r) => r.service),
      results.map((r) => r.state),
      results.map((r) => r.latency_ms),
      results.map((r) => r.detail),
    ],
  );
}

async function flushRequestMetrics(): Promise<void> {
  const finished = takeFinishedMinutes();
  if (finished.length === 0) return;
  await pool.query(
    `
      INSERT INTO request_metrics (minute, requests, total_ms, errors_5xx)
      SELECT * FROM unnest($1::timestamptz[], $2::int[], $3::bigint[], $4::int[])
      ON CONFLICT (minute) DO UPDATE SET
        requests = request_metrics.requests + EXCLUDED.requests,
        total_ms = request_metrics.total_ms + EXCLUDED.total_ms,
        errors_5xx = request_metrics.errors_5xx + EXCLUDED.errors_5xx
    `,
    [
      finished.map(([minute]) => minute),
      finished.map(([, b]) => b.requests),
      finished.map(([, b]) => b.total_ms),
      finished.map(([, b]) => b.errors_5xx),
    ],
  );
}

const TICKS_PER_HOUR = 60;
// PayMongo is probed every 5th tick, to stay well inside its rate limits.
const PAYMENTS_EVERY = 5;
let probeTick = 0;

/** Registers the health jobs with the scheduler; called once at startup. */
export function registerHealthJobs(): void {
  registerJob({ name: "flush request metrics", everyInstance: true, run: flushRequestMetrics });
  registerJob({
    name: "health probes",
    run: async () => {
      await storeProbes(await runProbes({ payments: probeTick++ % PAYMENTS_EVERY === 0 }));
    },
  });
  registerJob({
    name: "prune health history",
    everyTicks: TICKS_PER_HOUR,
    run: async () => {
      await pool.query(`DELETE FROM health_checks WHERE checked_at < now() - make_interval(days => $1)`, [PRUNE_AFTER_DAYS]);
      await pool.query(`DELETE FROM request_metrics WHERE minute < now() - make_interval(days => $1)`, [PRUNE_AFTER_DAYS]);
    },
  });
}

export interface ServiceStatus {
  id: ServiceId;
  name: string;
  description: string;
  state: ServiceState | "unknown";
  latency_ms: number | null;
  /** Share of checks in the last 30 days that were up; null with no checks. */
  uptime: number | null;
  detail: string | null;
  checked_at: string | null;
}

export interface Resource {
  label: string;
  /** Percent used, or null where the platform can't say. */
  percent: number | null;
  detail: string;
}

export interface HealthReport {
  services: ServiceStatus[];
  /** Average response time per hour, last 24 hours, oldest first; null for an hour with no traffic. */
  response_time_24h: { hour: string; avg_ms: number | null }[];
  requests_1h: number;
  /** Percent of last hour's responses that were 5xx. */
  error_rate_1h: number;
  active_sessions: number;
  resources: Resource[];
  process_uptime_s: number;
}

const GB = 1024 ** 3;
const gb = (bytes: number) => `${(bytes / GB).toFixed(1)} GB`;

async function resources(): Promise<Resource[]> {
  const cores = os.cpus().length || 1;
  const [load1] = os.loadavg();
  // Windows has no load average (it reports 0); Render runs Linux.
  const cpu: Resource =
    os.platform() === "win32"
      ? { label: "CPU", percent: null, detail: `${cores} cores; load not reported on Windows` }
      : {
          label: "CPU",
          percent: Math.min(100, Math.round(((load1 ?? 0) / cores) * 100)),
          detail: `load ${(load1 ?? 0).toFixed(2)} on ${cores} cores`,
        };

  const total = os.totalmem();
  const used = total - os.freemem();
  const rss = process.memoryUsage().rss;
  const memory: Resource = {
    label: "Memory",
    percent: Math.round((used / total) * 100),
    detail: `${gb(used)} of ${gb(total)}; the API uses ${Math.round(rss / 1024 ** 2)} MB`,
  };

  let disk: Resource;
  try {
    const stats = await fs.statfs(process.cwd());
    const diskTotal = stats.blocks * stats.bsize;
    const diskUsed = diskTotal - stats.bavail * stats.bsize;
    disk = { label: "Disk", percent: Math.round((diskUsed / diskTotal) * 100), detail: `${gb(diskUsed)} of ${gb(diskTotal)}` };
  } catch {
    disk = { label: "Disk", percent: null, detail: "Not reported on this platform" };
  }

  const inUse = pool.totalCount - pool.idleCount;
  const db: Resource = {
    label: "DB connections",
    percent: Math.round((inUse / poolMax()) * 100),
    detail: `${inUse} of ${poolMax()} in use, ${pool.waitingCount} waiting`,
  };
  return [cpu, memory, disk, db];
}

export async function getHealthReport(): Promise<HealthReport> {
  const [latest, uptime, hourly, lastHour, resourceList] = await Promise.all([
    pool.query(`
      SELECT DISTINCT ON (service) service, state, latency_ms, detail, checked_at
      FROM health_checks
      WHERE checked_at > now() - interval '1 day'
      ORDER BY service, checked_at DESC
    `),
    pool.query(`
      SELECT service,
             round(100.0 * count(*) FILTER (WHERE state <> 'down') / count(*), 2)::float AS uptime
      FROM health_checks
      WHERE checked_at > now() - interval '30 days' AND state <> 'not_configured'
      GROUP BY service
    `),
    pool.query(`
      WITH hours AS (
        SELECT generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') AS hour
      )
      SELECT h.hour,
             CASE WHEN sum(m.requests) > 0 THEN round(sum(m.total_ms)::numeric / sum(m.requests))::int END AS avg_ms
      FROM hours h
      LEFT JOIN request_metrics m ON date_trunc('hour', m.minute) = h.hour
      GROUP BY h.hour ORDER BY h.hour
    `),
    pool.query(`
      SELECT COALESCE(sum(requests), 0)::int AS requests, COALESCE(sum(errors_5xx), 0)::int AS errors
      FROM request_metrics WHERE minute > now() - interval '1 hour'
    `),
    resources(),
  ]);

  const latestBy = new Map(latest.rows.map((row) => [row.service, row]));
  const uptimeBy = new Map(uptime.rows.map((row) => [row.service, row.uptime]));
  const { requests, errors } = lastHour.rows[0];

  return {
    services: (Object.keys(SERVICES) as ServiceId[]).map((id) => {
      const row = latestBy.get(id);
      return {
        id,
        ...SERVICES[id],
        state: row?.state ?? "unknown",
        latency_ms: row?.latency_ms ?? null,
        uptime: uptimeBy.get(id) ?? null,
        detail: row?.detail ?? null,
        checked_at: row?.checked_at ?? null,
      };
    }),
    response_time_24h: hourly.rows,
    requests_1h: requests,
    error_rate_1h: requests > 0 ? Math.round((errors / requests) * 10_000) / 100 : 0,
    active_sessions: activeSessionCount(),
    resources: resourceList,
    process_uptime_s: Math.round(process.uptime()),
  };
}

const STATE_WORDS: Record<ServiceState, string> = {
  operational: "ok",
  degraded: "DEGRADED",
  down: "DOWN",
  not_configured: "not configured",
};

/** Runs every probe now (PayMongo included), stores them, and answers readable lines. */
export async function runDiagnostics(): Promise<string[]> {
  const results = await runProbes({ payments: true });
  await storeProbes(results);
  const lines = results.map(
    (r) =>
      `${SERVICES[r.service].name.padEnd(15)} ${STATE_WORDS[r.state].padEnd(14)} ${
        r.latency_ms === null ? "" : `${r.latency_ms} ms  `
      }${r.detail}`,
  );
  const problems = results.filter((r) => r.state === "down" || r.state === "degraded");
  lines.push(
    problems.length === 0
      ? "Done. Everything that's set up is working."
      : `Done. ${problems.length} problem${problems.length === 1 ? "" : "s"}: ${problems
          .map((r) => SERVICES[r.service].name)
          .join(", ")}.`,
  );
  return lines;
}
