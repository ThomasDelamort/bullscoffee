import { pool } from "./db.ts";

// Background jobs (health probes, automatic backups, pruning) on one timer
// that ticks every minute. Each job works out what's due from the database,
// not from the timer, so a restart or a Render instance that slept through
// a scheduled time catches up on its next tick.
//
// Most jobs must run once per tick across all server instances, so the tick
// first takes a Postgres advisory lock and an instance that doesn't get it
// skips them. Jobs marked everyInstance (flushing this process's in-memory
// counters) run on every instance regardless.

const TICK_MS = 60_000;
// The first tick comes soon after boot, so System Health has data quickly.
const FIRST_TICK_MS = 5_000;
// Any number every instance agrees on: "bull" in ASCII.
const LOCK_ID = 0x62756c6c;

export interface ScheduledJob {
  name: string;
  /** Run on every Nth tick; 1 (the default) is every minute. */
  everyTicks?: number;
  /** Run on every server instance, without the advisory lock. */
  everyInstance?: boolean;
  run: () => Promise<void>;
}

const jobs: ScheduledJob[] = [];
let tick = 0;
let ticking = false;
let timer: ReturnType<typeof setInterval> | undefined;

/** Adds a job; call before startScheduler(). */
export function registerJob(job: ScheduledJob): void {
  jobs.push(job);
}

async function runJobs(selected: ScheduledJob[]): Promise<void> {
  for (const job of selected) {
    if (tick % (job.everyTicks ?? 1) !== 0) continue;
    try {
      await job.run();
    } catch (error) {
      // One failing job never stops the others.
      console.error(`Scheduled job "${job.name}" failed:`, error);
    }
  }
}

async function runTick(): Promise<void> {
  // A tick still going (a slow backup) isn't run over by the next one.
  if (ticking) return;
  ticking = true;
  try {
    await runJobs(jobs.filter((job) => job.everyInstance));

    const shared = jobs.filter((job) => !job.everyInstance);
    if (shared.length === 0) return;
    const client = await pool.connect();
    try {
      const lock = await client.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [LOCK_ID],
      );
      if (!lock.rows[0]?.locked) return;
      try {
        await runJobs(shared);
      } finally {
        await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Scheduler tick failed:", error);
  } finally {
    tick += 1;
    ticking = false;
  }
}

/** Starts the timer. Called once from startServer(), after the schema is in place. */
export function startScheduler(): void {
  if (timer) return;
  setTimeout(() => void runTick(), FIRST_TICK_MS);
  timer = setInterval(() => void runTick(), TICK_MS);
}
