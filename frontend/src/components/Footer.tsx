import HeroImage from "../Home/Hero/HeroImage";
import { BRAND_GOLD, HILL_INK, LOGO_MARK, NAV_LINKS } from "../Home/Hero/hero.config";

const INK_ON_DARK = "#FBF3E8";

const CONTACT = [
  { label: "NU Cebu SM City Kaohsiung St, Cebu City, 6000 Cebu", href: undefined },
  { label: "sup@bullscoffee.com", href: "mailto:hello@bullscoffee.com" },
  { label: "(555) 012-3456", href: "tel:+15550123456" },
] as const;

const SOCIALS = [
  { label: "Instagram", href: "#", icon: InstagramIcon },
  { label: "Facebook", href: "#", icon: FacebookIcon },
  { label: "X", href: "#", icon: XIcon },
] as const;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: HILL_INK, color: INK_ON_DARK }}>
      <div className="mx-auto flex w-[min(92vw,64rem)] flex-col gap-10 py-14 sm:flex-row sm:justify-between sm:gap-6">
        <div className="max-w-xs">
          <a href="#home" className="flex items-center gap-2">
            <HeroImage
              file={LOGO_MARK}
              alt="Bull's Coffee"
              placeholderShape="circle"
              className="size-9 shrink-0 object-contain"
            />
            <span
              className="hero-display text-lg tracking-wide uppercase"
              style={{ color: BRAND_GOLD }}
            >
              Bull's Coffee
            </span>
          </a>
          <p className="mt-4 text-sm opacity-70">
            Rich aromas, exceptional beans, and a cup worth slowing down for.
          </p>
          <div className="mt-5 flex items-center gap-3">
            {SOCIALS.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="grid size-9 place-items-center rounded-full transition-colors hover:bg-current/10"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: BRAND_GOLD }}>
            Explore
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="opacity-80 transition-opacity hover:opacity-100">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: BRAND_GOLD }}>
            Get in touch
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {CONTACT.map((item) =>
              item.href ? (
                <li key={item.label}>
                  <a href={item.href} className="opacity-80 transition-opacity hover:opacity-100">
                    {item.label}
                  </a>
                </li>
              ) : (
                <li key={item.label} className="opacity-80">
                  {item.label}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-current/10">
        <div className="mx-auto flex w-[min(92vw,64rem)] flex-col-reverse items-center justify-between gap-3 py-6 text-xs opacity-60 sm:flex-row">
          <p>© {year} Bull's Coffee. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="transition-opacity hover:opacity-100">
              Privacy Policy
            </a>
            <a href="#" className="transition-opacity hover:opacity-100">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

const ICON_PROPS = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "size-4",
} as const;

function InstagramIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v3.5H8V21h3.5v-7.5h3l.5-3.5h-3.5V7.5c0-.8.7-1.5 1.5-1.5H15V3Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}
