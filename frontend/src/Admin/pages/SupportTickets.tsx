import { useState, type FormEvent } from "react";
import { FiAlertOctagon, FiArrowLeft, FiMessageSquare, FiSend } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import { useReplyToTicket, useTicket, useTickets, useUpdateTicket } from "../api/tickets";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Select, TextArea } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading } from "../components/QueryState";
import SearchInput from "../components/SearchInput";
import { TICKET_PRIORITY, TICKET_STATUS } from "../components/status";
import { FOCUS_RING } from "../components/styles";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import type { Ticket, TicketKind, TicketMessage, TicketPriority, TicketStatus, TicketWithMessages } from "../types";
import { formatDateTime, ticketNumber } from "../utils/format";

type KindFilter = TicketKind | "all";

const EMAIL_NOTE: Record<TicketMessage["email_status"], string | null> = {
  sent: null,
  failed: "Email failed",
  skipped: "Not emailed",
};

export default function SupportTickets() {
  const [kind, setKind] = useState<KindFilter>("all");
  const [showClosed, setShowClosed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const tickets = useTickets({ includeClosed: showClosed });

  const all = tickets.data?.tickets ?? [];
  const open = tickets.data?.open;
  const q = query.trim().toLowerCase();
  const visible = all.filter(
    (t) =>
      (kind === "all" || t.kind === kind) &&
      (!q || `${ticketNumber(t.id)} ${t.subject} ${t.reporter_name} ${t.reporter_email}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader
        title="Support Tickets"
        description="Complaints and bug reports sent from the storefront's Contact form. Replies are emailed to the reporter."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* On small screens the list and the detail take turns. */}
        <div className={`min-w-0 ${selectedId !== null ? "hidden lg:block" : ""}`}>
          <Card flush>
            <div className="flex flex-col gap-3 border-b border-(--admin-line) p-4">
              <Tabs
                label="Ticket type"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "all", label: "All", ...(open && { count: open.complaint + open.bug }) },
                  { value: "complaint", label: "Complaints", ...(open && { count: open.complaint }) },
                  { value: "bug", label: "Bug reports", ...(open && { count: open.bug }) },
                ]}
              />
              <SearchInput value={query} onChange={setQuery} placeholder="Search tickets" />
              <label className="flex items-center gap-2 text-xs text-(--admin-muted)">
                <input
                  type="checkbox"
                  checked={showClosed}
                  onChange={(e) => setShowClosed(e.target.checked)}
                  className="size-4 accent-(--admin-ink)"
                />
                Show resolved & closed
              </label>
            </div>
            {tickets.isPending && <Loading label="Loading tickets…" />}
            {tickets.isError && (
              <div className="p-4">
                <ErrorNotice error={tickets.error} onRetry={() => void tickets.refetch()} />
              </div>
            )}
            <ul className="max-h-144 divide-y divide-(--admin-line) overflow-y-auto">
              {visible.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  active={ticket.id === selectedId}
                  onSelect={() => setSelectedId(ticket.id)}
                />
              ))}
              {tickets.isSuccess && visible.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-(--admin-muted)">No tickets here.</li>
              )}
            </ul>
          </Card>
        </div>

        <div className={`min-w-0 ${selectedId !== null ? "" : "hidden lg:block"}`}>
          {selectedId !== null ? (
            <TicketPanel key={selectedId} ticketId={selectedId} onBack={() => setSelectedId(null)} />
          ) : (
            <div className="grid h-full min-h-72 place-items-center rounded-2xl border-2 border-dashed border-(--admin-line) p-8 text-center text-sm text-(--admin-muted)">
              <div>
                <FiMessageSquare aria-hidden className="mx-auto mb-2 size-6" />
                Select a ticket to read and reply.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TicketRow({ ticket, active, onSelect }: { ticket: Ticket; active: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-current={active || undefined}
        onClick={onSelect}
        className={`block w-full px-4 py-3 text-left transition-colors ${FOCUS_RING} ${
          active ? "bg-(--admin-gold)/10" : "hover:bg-(--admin-canvas)/60"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-(--admin-muted)">
            {ticketNumber(ticket.id)} · {ticket.kind === "bug" ? "Bug report" : "Complaint"}
          </span>
          <Badge tone={TICKET_PRIORITY[ticket.priority].tone}>{TICKET_PRIORITY[ticket.priority].label}</Badge>
        </div>
        <p className="mt-1 truncate text-sm font-medium">{ticket.subject}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-(--admin-muted)">
          <span className="truncate">
            {ticket.reporter_name} · {formatDateTime(ticket.created_at)}
          </span>
          <Badge tone={TICKET_STATUS[ticket.status].tone} dot>
            {TICKET_STATUS[ticket.status].label}
          </Badge>
        </div>
      </button>
    </li>
  );
}

function TicketPanel({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const ticket = useTicket(ticketId);
  if (ticket.isPending) return <Loading label="Loading ticket…" />;
  if (ticket.isError) return <ErrorNotice error={ticket.error} onRetry={() => void ticket.refetch()} />;
  return <TicketDetail ticket={ticket.data} onBack={onBack} />;
}

function TicketDetail({ ticket, onBack }: { ticket: TicketWithMessages; onBack: () => void }) {
  const notify = useToast();
  const update = useUpdateTicket();
  const replyTo = useReplyToTicket();
  const [reply, setReply] = useState("");

  const change = (changes: { status?: TicketStatus; priority?: TicketPriority }) =>
    update.mutate(
      { ticketId: ticket.id, changes },
      { onError: (error) => notify(errorMessage(error), "error") },
    );

  const send = (resolve: boolean) => {
    const body = reply.trim();
    if (!body) return;
    replyTo.mutate(
      { ticketId: ticket.id, body, resolve },
      {
        onSuccess: ({ email }) => {
          setReply("");
          if (email.status === "sent") notify(`Reply emailed to ${ticket.reporter_email}.`);
          else notify(`Reply saved, but it wasn't emailed: ${email.error}`, email.status === "failed" ? "error" : "info");
        },
        onError: (error) => notify(errorMessage(error), "error"),
      },
    );
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send(false);
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back to tickets"
            onClick={onBack}
            className={`-ml-1 grid size-7 place-items-center rounded-md hover:bg-(--admin-ink)/5 lg:hidden ${FOCUS_RING}`}
          >
            <FiArrowLeft aria-hidden className="size-4" />
          </button>
          {ticket.subject}
        </span>
      }
      description={`${ticketNumber(ticket.id)} · opened ${formatDateTime(ticket.created_at)} by ${ticket.reporter_name} (${ticket.reporter_email})${
        ticket.order_id ? ` · about order #${ticket.order_id}` : ""
      }`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status">
          <Select
            value={ticket.status}
            disabled={update.isPending}
            onChange={(e) => change({ status: e.target.value as TicketStatus })}
          >
            {(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>{TICKET_STATUS[s].label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select
            value={ticket.priority}
            disabled={update.isPending}
            onChange={(e) => change({ priority: e.target.value as TicketPriority })}
          >
            {(Object.keys(TICKET_PRIORITY) as TicketPriority[]).map((p) => (
              <option key={p} value={p}>{TICKET_PRIORITY[p].label}</option>
            ))}
          </Select>
        </Field>
      </div>

      {ticket.kind === "bug" && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 ring-1 ring-sky-200">
          <FiAlertOctagon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Bug report. Check System Health and Activity Logs around {formatDateTime(ticket.created_at)} while troubleshooting.
        </p>
      )}

      <ol className="mt-5 flex flex-col gap-3">
        <Message author={ticket.reporter_name} at={ticket.created_at} body={ticket.description} fromStaff={false} />
        {ticket.messages.map((m) => (
          <Message key={m.id} author={m.author_name} at={m.created_at} body={m.body} fromStaff note={EMAIL_NOTE[m.email_status]} />
        ))}
      </ol>
      <p className="mt-3 text-xs text-(--admin-muted)">
        The reporter's email replies go to the support inbox; they don't show up here.
      </p>

      <form onSubmit={submit} className="mt-5 border-t border-(--admin-line) pt-4">
        <Field label={`Reply to ${ticket.reporter_name}`}>
          <TextArea
            rows={4}
            maxLength={5000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a response. The reporter gets it by email."
          />
        </Field>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button disabled={!reply.trim() || replyTo.isPending} onClick={() => send(true)}>
            Reply & resolve
          </Button>
          <Button type="submit" variant="primary" icon={FiSend} disabled={!reply.trim() || replyTo.isPending}>
            {replyTo.isPending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface MessageProps {
  author: string;
  at: string;
  body: string;
  fromStaff: boolean;
  note?: string | null;
}

function Message({ author, at, body, fromStaff, note }: MessageProps) {
  return (
    <li className={`rounded-xl px-4 py-3 text-sm ${fromStaff ? "ml-6 bg-(--admin-gold)/10" : "mr-6 bg-(--admin-canvas)"}`}>
      <p className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold">
          {author}
          {fromStaff && <span className="ml-1.5 font-normal text-(--admin-muted)">Support</span>}
          {note && <span className="ml-1.5 font-normal text-amber-800">· {note}</span>}
        </span>
        <span className="text-(--admin-muted)">{formatDateTime(at)}</span>
      </p>
      <p className="mt-1.5 whitespace-pre-line">{body}</p>
    </li>
  );
}
