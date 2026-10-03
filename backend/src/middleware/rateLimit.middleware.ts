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

// GET /api/payments/orders/:id/status needs no sign-in either: the checkout
// return page polls it every few seconds until PayMongo's webhook lands. Set
// for a handful of devices on one address all waiting on a payment at once.
export const paymentStatusLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      error: "Too many requests. Please wait a moment and try again.",
    });
  },
});

// POST /api/support/tickets (the Contact form) needs no sign-in either. A
// person writes in a few times at most; this stops a script from filling
// the support inbox.
export const ticketLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      error: "You've sent several messages already. Please wait an hour, or email us directly.",
    });
  },
});
