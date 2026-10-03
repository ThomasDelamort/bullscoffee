import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { logSend, sendEmail } from "../lib/notify.ts";
import { recordActivity } from "../providers/activity.provider.ts";
import { getSettings } from "../providers/settings.provider.ts";
import {
  addReply,
  getTicket,
  listTickets,
  updateTicket,
  type TicketKind,
  type TicketPriority,
  type TicketStatus,
} from "../providers/tickets.provider.ts";
import type { Employee } from "../types/employee.types.ts";

const STATUSES: readonly TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES: readonly TicketPriority[] = ["low", "medium", "high", "urgent"];

const ticketNumber = (id: number) => `T-${id}`;

const parseId = (req: Request): number | undefined => {
  const id = Number(req.params["id"]);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

// GET /api/admin/tickets?kind=complaint|bug&include_closed=true
export const listTicketsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const kind = req.query["kind"];
    if (kind !== undefined && kind !== "" && kind !== "complaint" && kind !== "bug") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "kind must be complaint or bug" });
      return;
    }
    const list = await listTickets({
      kind: kind ? (kind as TicketKind) : undefined,
      include_closed: req.query["include_closed"] === "true",
    });
    res.status(StatusCodes.OK).json({ message: "Tickets", data: list });
  } catch (error: any) {
    console.error("listTicketsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch tickets" });
  }
};

export const getTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req);
    const ticket = id === undefined ? undefined : await getTicket(id);
    if (!ticket) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Ticket not found" });
      return;
    }
    res.status(StatusCodes.OK).json({ message: "Ticket", data: ticket });
  } catch (error: any) {
    console.error("getTicketHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch the ticket" });
  }
};

// PATCH { status?, priority? }
export const updateTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req);
    const { status, priority } = req.body ?? {};
    if (
      id === undefined ||
      !(status === undefined || STATUSES.includes(status)) ||
      !(priority === undefined || PRIORITIES.includes(priority)) ||
      (status === undefined && priority === undefined)
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "Send a status (open, in_progress, resolved, closed) or a priority (low, medium, high, urgent)",
      });
      return;
    }
    if (!(await updateTicket(id, { status, priority }))) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Ticket not found" });
      return;
    }
    const ticket = await getTicket(id);
    recordActivity(req, res, {
      module: "Support",
      action: `Set ${ticketNumber(id)} ${[
        status && `status to ${status.replace("_", " ")}`,
        priority && `priority to ${priority}`,
      ]
        .filter(Boolean)
        .join(" and ")}`,
    });
    res.status(StatusCodes.OK).json({ message: "Ticket updated", data: ticket });
  } catch (error: any) {
    console.error("updateTicketHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update the ticket" });
  }
};

// POST /:id/replies { body, resolve? }. Emails the reporter (Reply-To: the
// support address, so their answer reaches the inbox) and keeps the reply
// with whether the email went.
export const replyToTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req);
    const { body, resolve } = req.body ?? {};
    if (
      id === undefined ||
      typeof body !== "string" ||
      body.trim() === "" ||
      body.length > 5000 ||
      !(resolve === undefined || typeof resolve === "boolean")
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "body must be 1 to 5,000 characters" });
      return;
    }
    const ticket = await getTicket(id);
    if (!ticket) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Ticket not found" });
      return;
    }

    const admin: Employee = res.locals["employee"];
    const author = `${admin.first_name} ${admin.last_name}`;
    const settings = await getSettings();
    const quoted = ticket.description
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const sent = await sendEmail({
      to: ticket.reporter_email,
      subject: `Re: ${ticket.subject} [${ticketNumber(id)}]`,
      text: `Hi ${ticket.reporter_name},\n\n${body.trim()}\n\n${author}\n${settings.store_name}\n\nYou wrote:\n${quoted}`,
      replyTo: settings.support_email,
      storeName: settings.store_name,
    });
    void logSend("ticket-reply", ticket.order_id, ticket.reporter_email, sent).catch((error) =>
      console.error("Logging a ticket reply email failed:", error),
    );

    await addReply(
      id,
      { author_employee_id: admin.employee_id!, author_name: author, body: body.trim(), email_status: sent.status },
      resolve === true,
    );
    recordActivity(req, res, {
      module: "Support",
      action: `Replied to ${ticketNumber(id)}${resolve ? " and resolved it" : ""} (email ${sent.status})`,
    });
    res.status(StatusCodes.CREATED).json({
      message: sent.status === "sent" ? `Reply emailed to ${ticket.reporter_email}` : `Reply saved; email ${sent.status}`,
      data: { ticket: await getTicket(id), email: sent },
    });
  } catch (error: any) {
    console.error("replyToTicketHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to send the reply" });
  }
};
