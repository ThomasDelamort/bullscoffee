/** Class strings shared by kiosk controls. Touch targets stay at 44px or more. */

export const FOCUS_RING =
  "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-(--k-focus)";

/** For a label wrapping a visually hidden input. */
export const FOCUS_WITHIN_RING =
  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-(--k-focus)";

/** The storefront's call-to-action pill: gold, extrabold, uppercase. Add the horizontal padding where it's used. */
export const PRIMARY_BUTTON = `inline-flex h-16 shrink-0 items-center justify-center gap-2 rounded-full bg-(--k-gold) text-base font-extrabold sm:text-lg tracking-wide text-(--k-ink) uppercase shadow-[0_12px_30px_-12px_rgba(232,163,60,0.7)] transition hover:bg-(--k-gold-soft) active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`;

/** The quieter choice next to PRIMARY_BUTTON: white, outlined, same shape. */
export const SECONDARY_BUTTON = `inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-(--k-surface) text-base font-extrabold tracking-wide text-(--k-ink) uppercase ring-1 ring-(--k-line) transition ring-inset hover:ring-(--k-ink)/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`;

export const ROUND_BUTTON = `grid shrink-0 place-items-center rounded-full transition active:scale-95 disabled:pointer-events-none disabled:opacity-30 ${FOCUS_RING}`;

/** Small uppercase label above a group of choices. */
export const EYEBROW = "text-xs font-bold tracking-[0.2em] uppercase";
