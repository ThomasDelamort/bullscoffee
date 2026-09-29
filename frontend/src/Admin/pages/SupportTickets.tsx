import { useState, type FormEvent } from "react";
import { FiAlertOctagon, FiArrowLeft, FiMessageSquare, FiSend } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Select, TextArea } from "../components/Field";
import PageHeader from "../components/PageHeader";
import SearchInput from "../components/SearchInput";
import { TICKET_PRIORITY, TICKET_STATUS } from "../components/status";
import { FOCUS_RING } from "../components/styles";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import { TICKETS } from "../data/mock";
import type { Ticket, TicketKind, TicketPriority, TicketStatus } from "../types";
import { formatDateTime } from "../utils/format";

type KindFilter = TicketKind | "all";

const STAFF_NAME = "Chris Paredes";

export default function SupportTickets() {
  const notify = useToast();
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS);
  const [kind, setKind] = useState<KindFilter>("all");
  const [showClosed, setShowClosed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const visible = tickets.filter(
    (t) =>
      (kind === "all" || t.kind === kind) &&
      (showClosed || (t.status !== "resolved" && t.status !== "closed")) &&
      (!q || `${t.id} ${t.subject} ${t.reporter}`.toLowerCase().includes(q)),
  );
  const selected = tickets.find((t) => t.id === selectedId) ?? null;
  const countOf = (k: KindFilter) =>
    tickets.filter((t) => (k === "all" || t.kind === k) && t.status !== "resolved" && t.status !== "closed").length;

  const update = (id: string, patch: Partial<Ticket>) =>
    setTickets((current) => current.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <>
      <PageHeader
        title="Support Tickets"
        description="Respond to customer complaints and handle bug reports."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* On small screens the list and the detail take turns. */}
        <div className={`min-w-0 ${selected ? "hidden lg:block" : ""}`}>
          <Card flush>
            <div className="flex flex-col gap-3 border-b border-(--admin-line) p-4">
              <Tabs
                label="Ticket type"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "all", label: "All", count: countOf("all") },
                  { value: "complaint", label: "Complaints", count: countOf("complaint") },
                  { value: "bug", label: "Bug reports", count: countOf("bug") },
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
            <ul className="max-h-144 divide-y divide-(--admin-line) overflow-y-auto">
              {visible.map((ticket) => {
                const active = ticket.id === selectedId;
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      aria-current={active || undefined}
                      onClick={() => setSelectedId(ticket.id)}
                      className={`block w-full px-4 py-3 text-left transition-colors ${FOCUS_RING} ${
                        active ? "bg-(--admin-gold)/10" : "hover:bg-(--admin-canvas)/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-(--admin-muted)">
                          {ticket.id} · {ticket.kind === "bug" ? "Bug report" : "Complaint"}
                        </span>
                        <Badge tone={TICKET_PRIORITY[ticket.priority].tone}>
                          {TICKET_PRIORITY[ticket.priority].label}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{ticket.subject}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-(--admin-muted)">
                        <span className="truncate">{ticket.reporter}</span>
                        <Badge tone={TICKET_STATUS[ticket.status].tone} dot>
                          {TICKET_STATUS[ticket.status].label}
                        </Badge>
                      </div>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-(--admin-muted)">No tickets here.</li>
              )}
            </ul>
          </Card>
        </div>

        <div className={`min-w-0 ${selected ? "" : "hidden lg:block"}`}>
          {selected ? (
            <TicketDetail
              key={selected.id}
              ticket={selected}
              onBack={() => setSelectedId(null)}
              onChange={(patch) => update(selected.id, patch)}
              onReply={(body, resolve) => {
                update(selected.id, {
                  replies: [...selected.replies, { author: STAFF_NAME, from: "staff", body, at: new Date().toISOString() }],
                  status: resolve ? "resolved" : selected.status === "open" ? "in-progress" : selected.status,
                });
                notify(`Reply sent to ${selected.reporter_email}.`);
              }}
            />
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

interface TicketDetailProps {
  ticket: Ticket;
  onBack: () => void;
  onChange: (patch: Partial<Ticket>) => void;
  onReply: (body: string, resolve: boolean) => void;
}

function TicketDetail({ ticket, onBack, onChange, onReply }: TicketDetailProps) {
  const [reply, setReply] = useState("");

  const send = (resolve: boolean) => {
    if (!reply.trim()) return;
    onReply(reply.trim(), resolve);
    setReply("");
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
      description={`${ticket.id} · opened ${formatDateTime(ticket.created_at)} by ${ticket.reporter} (${ticket.reporter_email})`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status">
          <Select value={ticket.status} onChange={(e) => onChange({ status: e.target.value as TicketStatus })}>
            {(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>{TICKET_STATUS[s].label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={ticket.priority} onChange={(e) => onChange({ priority: e.target.value as TicketPriority })}>
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
        <Message author={ticket.reporter} at={ticket.created_at} body={ticket.description} fromStaff={false} />
        {ticket.replies.map((r) => (
          <Message key={r.at} author={r.author} at={r.at} body={r.body} fromStaff={r.from === "staff"} />
        ))}
      </ol>

      <form onSubmit={submit} className="mt-5 border-t border-(--admin-line) pt-4">
        <Field label={`Reply to ${ticket.reporter}`}>
          <TextArea
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a response. The reporter gets it by email."
          />
        </Field>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button disabled={!reply.trim()} onClick={() => send(true)}>
            Reply & resolve
          </Button>
          <Button type="submit" variant="primary" icon={FiSend} disabled={!reply.trim()}>
            Send reply
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Message({ author, at, body, fromStaff }: { author: string; at: string; body: string; fromStaff: boolean }) {
  return (
    <li className={`rounded-xl px-4 py-3 text-sm ${fromStaff ? "ml-6 bg-(--admin-gold)/10" : "mr-6 bg-(--admin-canvas)"}`}>
      <p className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold">
          {author}
          {fromStaff && <span className="ml-1.5 font-normal text-(--admin-muted)">Support</span>}
        </span>
        <span className="text-(--admin-muted)">{formatDateTime(at)}</span>
      </p>
      <p className="mt-1.5 whitespace-pre-line">{body}</p>
    </li>
  );
}
