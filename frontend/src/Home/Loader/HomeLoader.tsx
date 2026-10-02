import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BEAN_FIELD, HERO_FLAVORS, LOGO_MARK } from "../Hero/hero.config";
import { heroAssetUrl } from "../Hero/heroAssets";
import { usePrefersReducedMotion } from "../Hero/useHeroCycle";
import { GOLD } from "../theme";
import {
  EXIT_MS,
  MAX_WAIT_MS,
  MIN_VISIBLE_MS,
  MIN_VISIBLE_REDUCED_MS,
} from "./loader.config";
import PouringCup from "./PouringCup";

/** What the first screen of the hero shows: every cup on the wheel, the beans behind them and the nav logo. */
const HERO_FILES = [...HERO_FLAVORS.map((flavor) => flavor.cup), BEAN_FIELD.file, LOGO_MARK];

/** Resolves once the image is decoded; a broken or missing image must never hold the page back. */
function preloadImage(src: string): Promise<void> {
  const image = new Image();
  image.src = src;
  return image.decode().catch(() => undefined);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type Phase = "loading" | "leaving" | "done";

/** The loader plays once per page load; going to the kiosk and back doesn't bring it back. */
let played = false;

interface HomeLoaderProps {
  /** Dynamic imports for the chunks the page needs (the same ones its lazy components use). */
  preload: readonly (() => Promise<unknown>)[];
  children: ReactNode;
}

/**
 * Holds the Home page back behind a pouring cup until its code and hero images
 * are ready (and the pour has had time to play), then fades into it. The page
 * only mounts as the fade starts, so the hero begins its cycle from the first
 * flavor with nothing left to load.
 */
export default function HomeLoader({ preload, children }: HomeLoaderProps) {
  const [phase, setPhase] = useState<Phase>(played ? "done" : "loading");
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (phase !== "loading") return;
    let cancelled = false;

    const assets = Promise.all([
      ...preload.map((load) => load()),
      ...HERO_FILES.flatMap((file) => heroAssetUrl(file) ?? []).map(preloadImage),
    ]);
    const minimum = wait(reduceMotion ? MIN_VISIBLE_REDUCED_MS : MIN_VISIBLE_MS);
    const patience = wait(MAX_WAIT_MS);

    const reveal = () => {
      if (!cancelled) setPhase("leaving");
    };
    // A chunk that fails to load still opens the page: Suspense and the router surface that error.
    Promise.all([minimum, Promise.race([assets, patience])]).then(reveal, reveal);

    return () => {
      cancelled = true;
    };
  }, [phase, preload, reduceMotion]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const id = window.setTimeout(() => {
      played = true;
      setPhase("done");
    }, EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const leaving = phase === "leaving";

  return (
    <>
      {phase !== "loading" && children}
      {phase !== "done" && (
        <div
          role="status"
          aria-hidden={leaving || undefined}
          className={`fixed inset-0 z-1000 grid place-items-center transition-opacity duration-(--exit-ms) ease-out ${leaving ? "pointer-events-none opacity-0" : ""}`}
          style={{ backgroundColor: GOLD, "--exit-ms": `${EXIT_MS}ms` } as CSSProperties}
        >
          <span className="sr-only">Loading Bull's Coffee</span>
          <PouringCup />
        </div>
      )}
    </>
  );
}
