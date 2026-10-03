import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { StatusCodes } from "http-status-codes";
import { getCustomerByClerkId } from "../providers/customer.provider.ts";
import { createTicket, type TicketKind } from "../providers/tickets.provider.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fits = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim() !== "" && value.trim().length <= max;

const isKind = (value: unknown): value is TicketKind => value === "complaint" || value === "bug";

// A signed-in reporter is linked to their customer record; the session is
// read without protectRoute, since signing in isn't required. A customer_id
// in the body is never trusted.
const signedInCustomerId = async (req: Request): Promise<number | null> => {
  const { isAuthenticated, userId } = getAuth(req);
  if (!isAuthenticated || !userId) return null;
  const customer = await getCustomerByClerkId(userId);
  return customer?.customer_id ?? null;
};

// POST /api/support/tickets, public and rate limited: the storefront's
// Contact form. Answers only the ticket number, nothing about other tickets.
export const createTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kind, subject, description, name, email, order_id } = req.body ?? {};
    if (
      !isKind(kind) ||
      !fits(subject, 150) ||
      !fits(description, 5000) ||
      !fits(name, 100) ||
      !fits(email, 255) ||
      !EMAIL.test(email.trim()) ||
      !(order_id === undefined || order_id === null || (Number.isInteger(order_id) && order_id > 0))
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "Please fill in what it's about, a subject, your message, your name and a valid email.",
      });
      return;
    }

    const ticket = await createTicket({
      kind,
      subject: subject.trim(),
      description: description.trim(),
      reporter_name: name.trim(),
      reporter_email: email.trim(),
      customer_id: await signedInCustomerId(req),
      order_id: order_id ?? null,
    });
    res.status(StatusCodes.CREATED).json({
      message: "Thanks! We got your message and will reply by email.",
      data: { ticket_number: `T-${ticket.id}` },
    });
  } catch (error: any) {
    console.error("createTicketHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to send your message" });
  }
};
