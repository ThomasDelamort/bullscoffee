import {
  clamp,
  easeInOut,
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useId, useRef, type CSSProperties } from "react";
import "../Hero/hero.css";
import "../home.css";
import { CREMA, ESPRESSO, inkOn } from "../theme";
import { useElementSize } from "../useElementSize";
import FlavorPanel from "./FlavorPanel";
import { MENU_ITEMS } from "./menu.config";
import PourScene from "./PourScene";
import ShowcaseIndicator from "./ShowcaseIndicator";

/** Scroll spent flooding the screen with coffee, in screen heights. */
const POUR_SCREENS = 1.1;
/** Scroll spent resting on the last flavor before the page moves on. */
const HOLD_SCREENS = 0.3;

const BACKGROUNDS = MENU_ITEMS.map((item) => item.background);

const snapToPixel = (v: number) => Math.round(v * window.devicePixelRatio) / window.devicePixelRatio;

/** One flavor per screen on phones; wider screens let the neighbors peek in. */
const panelWidthFor = (stageWidth: number) =>
  stageWidth < 768 ? stageWidth : clamp(560, 1000, stageWidth * 0.58);

/**
 * The menu as one pinned scene. Scrolling first floods the page with coffee
 * (the headline turns cream exactly where the surface covers it), then turns
 * into sideways travel through the flavors, the coffee taking on each one's color.
 */
export default function PourShowcase() {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(stageRef);
  const inView = useInView(stageRef);

  const panelWidth = panelWidthFor(width);
  const pour = height * POUR_SCREENS;
  // Sideways travel at which each flavor is centered; the first starts a screen in.
  const centers = MENU_ITEMS.map((_, i) => width / 2 + (i + 0.5) * panelWidth);
  const travel = centers[centers.length - 1];
  const pinned = pour + travel + height * HOLD_SCREENS;
  // Whole pixels: a band edge on a fractional row shows up as a faint hairline.
  const waveHeight = Math.round(clamp(28, 72, height * 0.07));

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  // Springing the distance smooths out mouse-wheel steps for every layer at once.
  const scrolled = useSpring(
    useTransform(() => scrollYProgress.get() * pinned),
    { stiffness: 240, damping: 40, mass: 0.35 },
  );
  const fill = useTransform(scrolled, (s) => clamp(0, 1, s / pour));
  const traveled = useTransform(scrolled, (s) => clamp(0, travel, s - pour));
  const trackX = useTransform(traveled, (t) => -t);
  const liquidY = useTransform(fill, (f) => snapToPixel(height - (height + waveHeight) * easeInOut(f)));
  // Content inside the liquid shifts back so it stays put while the surface rises.
  const counterY = useTransform(liquidY, (y) => -y);
  const liquidColor = useTransform(traveled, [0, ...centers], [ESPRESSO, ...BACKGROUNDS]);
  // Flips between espresso and cream as the coffee crosses mid-tone, never a muddy blend.
  const inkColor = useTransform(liquidColor, inkOn);
  const flavorProgress = useTransform(traveled, [centers[0], travel], [0, 1]);
  const indicatorOpacity = useTransform(traveled, [centers[0] * 0.4, centers[0] * 0.85], [0, 1]);

  // A transformed track can't scroll focus into view, so bring the panel to center stage.
  const centerPanel = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: sectionTop + pour + centers[index], behavior: "smooth" });
  };

  const scene = { fill, trackX, stageHeight: height };

  return (
    <section
      id="menu"
      ref={sectionRef}
      aria-labelledby={headingId}
      className="relative bg-white"
      style={{ height: height + pinned }}
    >
      <div
        ref={stageRef}
        className={`sticky top-0 h-svh overflow-clip ${inView ? "" : "liquid-paused"}`}
        style={{ "--wave-h": `${waveHeight}px`, "--crema-h": `${Math.round(waveHeight * 1.6)}px` } as CSSProperties}
      >
        {/* Crema: a slower, lighter wave peeking over the surface. */}
        <motion.div aria-hidden className="absolute inset-x-0 top-0 z-10" style={{ y: liquidY }}>
          <div
            className="liquid-wave absolute inset-x-0 bottom-0 h-(--crema-h)"
            style={{ backgroundColor: CREMA, "--wave-dur": "9s", animationDelay: "-4s" } as CSSProperties}
          />
        </motion.div>

        <div className="absolute inset-0 z-20">
          <PourScene {...scene} headingId={headingId} />
        </div>

        <motion.div
          className="absolute inset-x-0 top-0 z-30 h-[calc(100%_+_var(--wave-h))] will-change-transform"
          style={{ y: liquidY }}
        >
          <motion.div
            aria-hidden
            className="liquid-wave absolute inset-x-0 bottom-full h-(--wave-h) overflow-hidden"
            style={{ backgroundColor: liquidColor }}
          >
            <motion.div className="absolute inset-x-0 top-full h-svh" style={{ y: counterY }}>
              <PourScene {...scene} submerged />
            </motion.div>
          </motion.div>

          <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: liquidColor }}>
            <motion.div
              className="absolute inset-x-0 top-0 h-svh will-change-transform"
              style={{ y: counterY }}
            >
              <PourScene {...scene} submerged />
              <motion.div
                className="absolute inset-y-0 left-0 flex will-change-transform"
                style={{ x: trackX, paddingLeft: width }}
              >
                {MENU_ITEMS.map((item, i) => (
                  <FlavorPanel
                    key={item.id}
                    item={item}
                    index={i}
                    width={panelWidth}
                    stageHeight={height}
                    center={centers[i]}
                    traveled={traveled}
                    onKeyboardFocus={centerPanel}
                  />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        <ShowcaseIndicator
          items={MENU_ITEMS}
          progress={flavorProgress}
          opacity={indicatorOpacity}
          color={inkColor}
        />
      </div>
    </section>
  );
}
