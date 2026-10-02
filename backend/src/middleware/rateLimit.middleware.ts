import type { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { StatusCodes } from "http-status-codes";

// POST /api/kiosk/orders needs no sign-in, so without a cap a script could
// fill the counter's queue with fake orders. Counted per IP address, and set
// for the busiest honest case: the store's kiosk, plus phones on the campus
// Wi-Fi that all share one public address, ordering a few times a minute.
// Counts live in memory: they reset on restart and aren't shared between
// server instances.
const KIOSK_ORDER_WINDOW_MS = 5 * 60_000;
const KIOSK_ORDERS_PER_WINDOW = 30;

export const kioskOrderLimiter = rateLimit({
  windowMs: KIOSK_ORDER_WINDOW_MS,
  limit: KIOSK_ORDERS_PER_WINDOW,
  // RateLimit-* headers tell a client when it can try again.
  standardHeaders: "draft-8",
  legacyHeaders: false,
  // Through res.json, so the 429 gets the same { error } envelope as every
  // other failure and the kiosk can show the message as is.
  handler: (_req: Request, res: Response) => {
    res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      error:
        "Too many orders from this device. Please wait a few minutes, or order at the counter.",
    });
  },
});
