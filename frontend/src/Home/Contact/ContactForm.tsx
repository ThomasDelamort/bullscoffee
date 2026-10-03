import { useMutation } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import "../Hero/hero.css";
import { ApiError, errorMessage } from "../../lib/api";
import { useApi } from "../../lib/apiContext";
import { useSupportEmail } from "../../lib/publicSettings";
import { BRAND_GOLD, HILL_INK, INK_ON_DARK } from "../Hero/hero.config";
import { CONTACT_EMAIL } from "./contact.config";

const FIELD =
  "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 transition-colors focus:border-(--brand-gold) focus:bg-white/15 focus:outline-none";

type Kind = "complaint" | "bug";

interface TicketDraft {
  kind: Kind;
  subject: string;
  description: string;
  name: string;
  email: string;
  order_id: number | null;
}

/**
 * Sends the message to the admin Support Tickets inbox (POST /support/tickets).
 * A signed-in customer's session goes along, so the ticket is linked to them.
 */
export default function ContactForm() {
  const api = useApi();
  const supportEmail = useSupportEmail(CONTACT_EMAIL);
  const [kind, setKind] = useState<Kind>("complaint");
  const [subject, setSubject] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: (draft: TicketDraft) => api.post<{ ticket_number: string }>("/support/tickets", draft),
  });
  const ids = { kind: useId(), subject: useId(), name: useId(), email: useId(), order: useId(), message: useId() };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const order = Number(orderNumber.replace(/^#/, "").trim());
    send.mutate(
      {
        kind,
        subject: subject.trim(),
        description: message.trim(),
        name: name.trim(),
        email: email.trim(),
        order_id: Number.isInteger(order) && order > 0 ? order : null,
      },
      {
        onSuccess: () => {
          setSubject("");
          setOrderNumber("");
          setMessage("");
        },
      },
    );
  };

  // Offline, or the server's down: the address still works.
  const unreachable = send.error instanceof ApiError && (send.error.status === 0 || send.error.status >= 500);

  return (
    <div
      className="rounded-[28px] p-8 shadow-xl sm:p-10"
      style={{
        backgroundColor: HILL_INK,
        color: INK_ON_DARK,
        ["--brand-gold" as string]: BRAND_GOLD,
      }}
    >
      <h3 className="hero-display text-3xl uppercase" style={{ color: BRAND_GOLD }}>
        Send us a note
      </h3>

      {send.isSuccess ? (
        <div role="status" className="mt-6 flex flex-col gap-4">
          <p className="text-base font-bold">Thanks, we got it! Your reference is {send.data.ticket_number}.</p>
          <p className="text-sm opacity-80">We'll reply to {email.trim()} as soon as we can.</p>
          <button
            type="button"
            onClick={() => send.reset()}
            className="self-start text-sm font-bold underline underline-offset-2"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label htmlFor={ids.kind} className="sr-only">
            What's this about?
          </label>
          <select
            id={ids.kind}
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className={`${FIELD} [&>option]:text-stone-900`}
          >
            <option value="complaint">Feedback or a complaint</option>
            <option value="bug">Something isn't working</option>
          </select>

          <label htmlFor={ids.subject} className="sr-only">
            Subject
          </label>
          <input
            id={ids.subject}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={150}
            required
            className={FIELD}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={ids.name} className="sr-only">
                Your name
              </label>
              <input
                id={ids.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                maxLength={100}
                required
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor={ids.email} className="sr-only">
                Email
              </label>
              <input
                id={ids.email}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                maxLength={255}
                required
                className={FIELD}
              />
            </div>
          </div>

          <label htmlFor={ids.order} className="sr-only">
            Order number (optional)
          </label>
          <input
            id={ids.order}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Order number, if it's about an order (optional)"
            inputMode="numeric"
            className={FIELD}
          />

          <label htmlFor={ids.message} className="sr-only">
            Message
          </label>
          <textarea
            id={ids.message}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            maxLength={5000}
            required
            rows={5}
            className={`${FIELD} resize-y`}
          />

          {send.isError && (
            <p role="alert" className="rounded-xl bg-red-500/15 px-4 py-3 text-sm">
              {unreachable
                ? `We couldn't send your message. Please email us at ${supportEmail} instead.`
                : errorMessage(send.error)}
            </p>
          )}

          <button
            type="submit"
            disabled={send.isPending}
            className="mt-2 rounded-full px-7 py-3.5 text-base font-extrabold uppercase shadow-md transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
            style={{ backgroundColor: BRAND_GOLD, color: HILL_INK }}
          >
            {send.isPending ? "Sending…" : "Send message"}
          </button>
          <p className="text-center text-xs opacity-60">
            Or email us at{" "}
            <a href={`mailto:${supportEmail}`} className="underline underline-offset-2">
              {supportEmail}
            </a>
          </p>
        </form>
      )}
    </div>
  );
}
