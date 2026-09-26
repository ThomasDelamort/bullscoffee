import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import HeroImage from './HeroImage';
import { BRAND_GOLD, LOGO_MARK, NAV_LINKS, type NavHref } from './hero.config';

interface NavbarProps {
  /** Mobile menu panel background. */
  surface: string;
}

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current';

export default function Navbar({ surface }: NavbarProps) {
  const [activeHref, setActiveHref] = useState<NavHref>('#home');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const closeOnOutsidePress = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsidePress);
    };
  }, [menuOpen]);

  const select = (href: NavHref) => {
    setActiveHref(href);
    setMenuOpen(false);
  };

  return (
    <header ref={headerRef} className="absolute inset-x-0 top-0 z-50">
      <nav
        aria-label="Primary"
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6 lg:px-10 lg:py-5"
      >
        <a
          href="#home"
          onClick={() => select('#home')}
          className={`flex items-center gap-2 justify-self-start rounded-md ${FOCUS_RING}`}
        >
          <HeroImage
            file={LOGO_MARK}
            alt="ButchwithCoffee"
            placeholderShape="circle"
            className="size-9 shrink-0 object-contain lg:size-11"
          />
          <span
            className="hero-display text-lg tracking-wide whitespace-nowrap uppercase lg:text-2xl"
            style={{ color: BRAND_GOLD }}
          >
            Bull's Coffee
          </span>
        </a>

        <ul className="hidden items-center gap-8 md:flex lg:gap-10">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                aria-current={link.href === activeHref ? 'page' : undefined}
                onClick={() => select(link.href)}
                className={`relative rounded-sm py-1 text-sm font-medium transition-opacity after:absolute after:inset-x-[-0.5rem] after:-bottom-1 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-current after:transition-transform hover:opacity-70 aria-[current=page]:after:scale-x-100 lg:text-base ${FOCUS_RING}`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="col-start-3 flex items-center gap-1 justify-self-end sm:gap-2">
          <IconButton label="Cart">
            <CartIcon />
          </IconButton>
          <SignedOut>
            <SignInButton mode="modal">
              <IconButton label="Sign in or sign up">
                <AccountIcon />
              </IconButton>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="grid size-10 place-items-center lg:size-11">
              <UserButton />
            </div>
          </SignedIn>
          <IconButton
            label={menuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        </div>
      </nav>

      <div
        id={menuId}
        hidden={!menuOpen}
        className="absolute inset-x-4 top-full rounded-2xl p-2 shadow-xl ring-1 ring-current/10 transition-colors duration-(--hero-dur) ease-(--hero-ease) sm:inset-x-6 md:hidden"
        style={{ backgroundColor: surface }}
      >
        <ul className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                aria-current={link.href === activeHref ? 'page' : undefined}
                onClick={() => select(link.href)}
                className={`block rounded-xl px-4 py-3 text-base font-medium hover:bg-current/5 aria-[current=page]:bg-current/10 ${FOCUS_RING}`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

interface IconButtonProps {
  label: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

function IconButton({ label, children, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid size-10 place-items-center rounded-full transition-colors hover:bg-current/10 lg:size-11 ${FOCUS_RING} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

const ICON_PROPS = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'size-6 lg:size-7',
} as const;

function CartIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M2.5 3.5h2.2l2.4 11.1a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2l1.6-6.7H5.8" />
      <circle cx="9.5" cy="20" r="1.2" />
      <circle cx="17" cy="20" r="1.2" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="10" r="3.2" />
      <path d="M6.2 18.8a6.8 6.8 0 0 1 11.6 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
