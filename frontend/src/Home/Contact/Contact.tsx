import "../Hero/hero.css";
import { BRAND_GOLD } from "../Hero/hero.config";
import ContactForm from "./ContactForm";
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_HOURS, CONTACT_PHONE } from "./contact.config";
import InfoCard from "./InfoCard";

export default function Contact() {
  return (
    <section id="contact" className="bg-[#FBF3E8] py-20 sm:py-28">
      <div className="mx-auto grid w-[min(92vw,72rem)] gap-14 lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-16">
        <div>
          <span
            className="text-xs font-bold tracking-[0.2em] uppercase"
            style={{ color: BRAND_GOLD }}
          >
            Contact Us
          </span>

          <h2 className="hero-display mt-3 text-5xl leading-[0.95] text-stone-900 uppercase sm:text-6xl">
            Come say <span style={{ color: BRAND_GOLD }}>hello</span>.
          </h2>

          <p className="mt-5 max-w-md text-stone-500">
            Questions, catering for your org, or feedback on your last brew: we
            read everything.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <InfoCard label="Visit">
              {CONTACT_ADDRESS.map((line) => (
                <p key={line} className="text-stone-900">
                  {line}
                </p>
              ))}
            </InfoCard>

            <InfoCard label="Hours">
              <dl className="flex flex-col gap-1.5">
                {CONTACT_HOURS.map(({ days, time }) => (
                  <div key={days} className="flex items-baseline justify-between gap-3">
                    <dt className="text-stone-500">{days}</dt>
                    <dd className="font-bold text-stone-900">{time}</dd>
                  </div>
                ))}
              </dl>
            </InfoCard>

            <InfoCard label="Email">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-bold text-stone-900 underline decoration-transparent underline-offset-2 transition-colors hover:decoration-current"
              >
                {CONTACT_EMAIL}
              </a>
              <a
                href={CONTACT_PHONE.href}
                className="mt-1.5 block text-stone-500 transition-colors hover:text-stone-900"
              >
                {CONTACT_PHONE.label}
              </a>
            </InfoCard>
          </div>
        </div>

        <ContactForm />
      </div>
    </section>
  );
}
