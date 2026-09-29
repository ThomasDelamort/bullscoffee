import {
  easeIn,
  motion,
  useMotionTemplate,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import HeroImage from "../Hero/HeroImage";
import "../home.css";
import { MENU_ITEMS } from "../Menu/menu.config";
import { CREAM, ESPRESSO, GOLD } from "../theme";

const MOCHA = MENU_ITEMS[1];

/*
 * --frame-h  height of the cup's image frame
 * --dive-x/y where the camera dives in: the bulldog emblem on the cup's
 *            sleeve, at 46% / 59% of the frame
 */
const LAYOUT = [
  "[--frame-h:min(74svh,120vw)]",
  "[--dive-x:calc(50%_-_0.02*var(--frame-h))]",
  "[--dive-y:calc(50%_+_0.09*var(--frame-h))]",
].join(" ");

/**
 * "Go deeper": the words split apart, beans burst toward the camera, and the
 * view dives into the cup until an espresso portal opens onto the story.
 */
export default function DiveStage({ headingId }: { headingId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.3, restDelta: 0.0005 });

  const leftX = useTransform(p, [0, 0.4], ["0vw", "-55vw"]);
  const rightX = useTransform(p, [0, 0.4], ["0vw", "55vw"]);
  const wordsOpacity = useTransform(p, [0.12, 0.38], [1, 0]);
  const hintOpacity = useTransform(p, [0, 0.06], [1, 0]);

  const cupScale = useTransform(p, [0.02, 0.62], [1, 7.5], { ease: easeIn });
  const backScale = useTransform(p, [0, 0.5], [1, 2.4]);
  const backRotate = useTransform(p, [0, 0.5], [0, 30]);
  const burstScale = useTransform(p, [0.04, 0.5], [0.3, 3.4], { ease: easeIn });
  const burstRotate = useTransform(p, [0.04, 0.5], [0, -50]);
  const burstOpacity = useTransform(p, [0.04, 0.14, 0.38, 0.5], [0, 1, 1, 0]);
  const beansOpacity = useTransform(p, [0.18, 0.48], [1, 0]);

  const radius = useTransform(p, [0.3, 0.64], [0, 92], { ease: easeIn });
  const clipPath = useMotionTemplate`circle(${radius}% at var(--dive-x) var(--dive-y))`;
  const headingOpacity = useTransform(p, [0.58, 0.78], [0, 1]);
  const headingScale = useTransform(p, [0.58, 0.86], [0.82, 1]);

  return (
    <div ref={ref} className="relative h-[260svh]">
      <div
        className={`sticky top-0 h-svh overflow-clip ${LAYOUT}`}
        style={{ backgroundColor: CREAM, color: ESPRESSO }}
      >
        <div
          aria-hidden
          className="hero-display absolute inset-0 flex flex-col items-center justify-between py-[9svh] text-[25vw] leading-[0.85] uppercase md:grid md:grid-cols-[1fr_calc(var(--frame-h)*0.46)_1fr] md:items-center md:py-0 md:text-[min(11vw,24svh)]"
        >
          <motion.span className="will-change-transform md:justify-self-end" style={{ x: leftX, opacity: wordsOpacity }}>
            Go
          </motion.span>
          <span className="hidden md:block" />
          <motion.span className="will-change-transform md:justify-self-start" style={{ x: rightX, opacity: wordsOpacity }}>
            Deeper<span style={{ color: GOLD }}>.</span>
          </motion.span>
        </div>

        <motion.div
          aria-hidden
          className="absolute top-1/2 left-1/2 z-10 w-[calc(var(--frame-h)*1.35)] -translate-1/2 will-change-transform"
          style={{ scale: backScale, rotate: backRotate, opacity: beansOpacity }}
        >
          <HeroImage file="beans.png" alt="" className="w-full select-none" />
        </motion.div>

        <motion.div
          aria-hidden
          className="absolute top-1/2 left-1/2 z-20 aspect-1/2 h-(--frame-h) -translate-1/2 will-change-transform"
          style={{ scale: cupScale, transformOrigin: "46% 59%" }}
        >
          <HeroImage file={MOCHA.cup} alt="" className="size-full object-cover select-none" />
        </motion.div>

        <motion.div
          aria-hidden
          className="absolute top-(--dive-y) left-(--dive-x) z-30 w-(--frame-h) -translate-1/2 will-change-transform"
          style={{ scale: burstScale, rotate: burstRotate, opacity: burstOpacity }}
        >
          <HeroImage file="beans.png" alt="" className="w-full rotate-180 select-none" />
        </motion.div>

        <motion.p
          aria-hidden
          className="absolute bottom-6 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-2 text-xs font-bold tracking-[0.25em] uppercase md:flex"
          style={{ opacity: hintOpacity }}
        >
          Scroll to dive in
          <span className="inline-block animate-[scroll-nudge_1.6s_ease-in-out_infinite]">↓</span>
        </motion.p>

        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center px-6 text-center"
          style={{ clipPath, backgroundColor: ESPRESSO, color: CREAM }}
        >
          <motion.div style={{ opacity: headingOpacity, scale: headingScale }}>
            <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: GOLD }}>
              About us
            </p>
            <h2
              id={headingId}
              className="hero-display mt-4 text-[clamp(4rem,16vw,13rem)] leading-[0.85] uppercase"
            >
              Our <span style={{ color: GOLD }}>story.</span>
            </h2>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
