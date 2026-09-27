import { useId, useState, type FormEvent } from "react";
import "../Hero/hero.css";
import { BRAND_GOLD, HILL_INK, INK_ON_DARK } from "../Hero/hero.config";
import { CONTACT_EMAIL } from "./contact.config";

const FIELD =
  "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 transition-colors focus:border-(--brand-gold) focus:bg-white/15 focus:outline-none";

/**
 * No backend inbox exists for this yet, so submitting opens the visitor's
 * own email app with the message pre-filled, addressed to the shop.
 */
function mailtoHref(name: string, email: string, message: string): string {
  const subject = `Message from ${name || "the website"}`;
  const body = `${message}\n\n— ${name}${email ? ` (${email})` : ""}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    window.location.href = mailtoHref(name, email, message);
  };

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

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label htmlFor={nameId} className="sr-only">
          Your name
        </label>
        <input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          required
          className={FIELD}
        />

        <label htmlFor={emailId} className="sr-only">
          Email
        </label>
        <input
          id={emailId}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          required
          className={FIELD}
        />

        <label htmlFor={messageId} className="sr-only">
          Message
        </label>
        <textarea
          id={messageId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          required
          rows={5}
          className={`${FIELD} resize-y`}
        />

        <button
          type="submit"
          className="mt-2 rounded-full px-7 py-3.5 text-base font-extrabold uppercase shadow-md transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          style={{ backgroundColor: BRAND_GOLD, color: HILL_INK }}
        >
          Send message
        </button>
        <p className="text-center text-xs opacity-60">
          Opens your email app, addressed to {CONTACT_EMAIL}
        </p>
      </form>
    </div>
  );
}
