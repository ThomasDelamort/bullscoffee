import "../Hero/hero.css";
import { BRAND_GOLD, INK_ON_DARK } from "../Hero/hero.config";
import Reveal from "../Reveal";
import ContactForm from "./ContactForm";
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_HOURS, CONTACT_PHONE } from "./contact.config";
import InfoCard from "./InfoCard";
import { useSupportEmail } from "../../lib/publicSettings";

export default function Contact() {
  const supportEmail = useSupportEmail(CONTACT_EMAIL);
  return (
    <section id="contact" className="relative py-20 sm:py-28" style={{ backgroundColor: INK_ON_DARK }}>
      {/* The hero's hill again, rising out of the section above. */}
      <div
        aria-hidden
        className="absolute bottom-full left-[-25%] h-[14vw] w-[150%] translate-y-1/2 rounded-[50%]"
        style={{ backgroundColor: INK_ON_DARK }}
      />
      <div className="relative mx-auto grid w-[min(92vw,72rem)] gap-14 lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-16">
        <Reveal>
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
            <Reveal delay={0.1}>
              <InfoCard label="Visit">
                {CONTACT_ADDRESS.map((line) => (
                  <p key={line} className="text-stone-900">
                    {line}
                  </p>
                ))}
              </InfoCard>
            </Reveal>

            <Reveal delay={0.18}>
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
            </Reveal>

            <Reveal delay={0.26}>
              <InfoCard label="Email">
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-bold text-stone-900 underline decoration-transparent underline-offset-2 transition-colors hover:decoration-current"
                >
                  {supportEmail}
                </a>
                <a
                  href={CONTACT_PHONE.href}
                  className="mt-1.5 block text-stone-500 transition-colors hover:text-stone-900"
                >
                  {CONTACT_PHONE.label}
                </a>
              </InfoCard>
            </Reveal>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
