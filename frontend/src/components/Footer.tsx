import { Link } from "react-router-dom";
import { ADMIN_BASE_PATH } from "../Admin/routes";
import HeroImage from "../Home/Hero/HeroImage";
import {
  BRAND_GOLD,
  HILL_INK,
  INK_ON_DARK,
  LOGO_MARK,
  NAV_LINKS,
} from "../Home/Hero/hero.config";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
} from "../Home/Contact/contact.config";
import type { IconType } from "react-icons";
import { FiFacebook, FiInstagram } from "react-icons/fi";
import { RiTwitterXFill } from "react-icons/ri";
import { FaDiscord } from "react-icons/fa";

type socials = {
  label: string;
  href: string;
  icon: IconType;
};

type contact = {
  label: string;
  href: string | undefined;
};

// Kept in step with the Contact section's info via contact.config.ts.
const CONTACT: contact[] = [
  { label: CONTACT_ADDRESS.join(", "), href: undefined },
  { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
  { label: CONTACT_PHONE.label, href: CONTACT_PHONE.href },
];

const SOCIALS: socials[] = [
  { label: "Instagram", href: "#", icon: FiFacebook },
  { label: "Facebook", href: "#", icon: FiInstagram },
  { label: "Discord", href: "#", icon: FaDiscord },
  { label: "X", href: "#", icon: RiTwitterXFill },
] as const;

export default function Footer(): React.JSX.Element {
  const year: number = new Date().getFullYear();

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer style={{ backgroundColor: HILL_INK, color: INK_ON_DARK }}>
      <div className="mx-auto flex w-[min(92vw,64rem)] flex-col gap-10 py-14 sm:flex-row sm:justify-between sm:gap-6">
        <div className="max-w-xs">
          <a href="#home" onClick={scrollToSection("home")} className="flex items-center gap-2">
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
          <h3
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: BRAND_GOLD }}
          >
            Explore
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  onClick={scrollToSection(link.id)}
                  className="opacity-80 transition-opacity hover:opacity-100"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: BRAND_GOLD }}
          >
            Get in touch
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {CONTACT.map((item) =>
              item.href ? (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="opacity-80 transition-opacity hover:opacity-100"
                  >
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
            <Link to={ADMIN_BASE_PATH} className="transition-opacity hover:opacity-100">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
