import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";

// Per-minute API counters for System Health, kept in this process's memory
// and added to request_metrics by a scheduler job each minute. They're per
// process: a restart loses the minute in progress, and each instance counts
// its own requests (the table sums them).

interface Bucket {
  requests: number;
  total_ms: number;
  errors_5xx: number;
}

const buckets = new Map<number, Bucket>();
const MINUTE_MS = 60_000;

// Signed-in users by when this process last saw them, for "active sessions".
const lastSeen = new Map<string, number>();
const ACTIVE_WINDOW_MS = 15 * MINUTE_MS;

/** Registered after clerkMiddleware, so the request's Clerk user is known. */
export function requestMetrics(req: Request, res: Response, next: NextFunction): void {
  const started = performance.now();
  res.on("finish", () => {
    const minute = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
    const bucket = buckets.get(minute) ?? { requests: 0, total_ms: 0, errors_5xx: 0 };
    bucket.requests += 1;
    bucket.total_ms += Math.round(performance.now() - started);
    if (res.statusCode >= 500) bucket.errors_5xx += 1;
    buckets.set(minute, bucket);

    try {
      const { userId } = getAuth(req);
      if (userId) lastSeen.set(userId, Date.now());
    } catch {
      // No Clerk auth on this request (e.g. the PayMongo webhook).
    }
  });
  next();
}

/** Removes and returns every finished minute's counts, keyed by the minute's start. */
export function takeFinishedMinutes(): [Date, Bucket][] {
  const current = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
  const finished: [Date, Bucket][] = [];
  for (const [minute, bucket] of buckets) {
    if (minute < current) {
      finished.push([new Date(minute), bucket]);
      buckets.delete(minute);
    }
  }
  return finished;
}

/** Signed-in users this process has served in the last 15 minutes. */
export function activeSessionCount(): number {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  for (const [userId, seen] of lastSeen) {
    if (seen < cutoff) lastSeen.delete(userId);
  }
  return lastSeen.size;
}
