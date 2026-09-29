import { clamp, motion, useTransform, type MotionValue } from "motion/react";
import { useId, type FocusEvent } from "react";
import HeroImage from "../Hero/HeroImage";
import { heroPalette } from "../Hero/palette";
import FlavorInfo from "./FlavorInfo";
import type { MenuItem } from "./menu.config";

interface FlavorPanelProps {
  item: MenuItem;
  index: number;
  width: number;
  stageHeight: number;
  /** Sideways travel (px) at which this panel is centered. */
  center: number;
  traveled: MotionValue<number>;
  onKeyboardFocus: (index: number) => void;
}

export default function FlavorPanel({
  item,
  index,
  width,
  stageHeight,
  center,
  traveled,
  onKeyboardFocus,
}: FlavorPanelProps) {
  const headingId = useId();
  const ink = heroPalette(item.background).ink;
  const word = item.name.split(" ")[0];

  // Distance from center stage in panel widths: positive while still to the right.
  const offset = useTransform(traveled, (t) => (center - t) / width);
  // Slow layers of far-off panels would drift into view early, so they fade in with distance.
  const presence = useTransform(offset, (o) => clamp(0, 1, (1.3 - Math.abs(o)) / 0.7));
  const wordOpacity = useTransform(presence, (v) => v * 0.1);
  // Each layer passes at its own speed: the word lags far behind, the cup pushes ahead.
  const wordX = useTransform(offset, (o) => o * width * -0.45);
  const splashX = useTransform(offset, (o) => o * width * -0.22);
  const splashRotate = useTransform(offset, (o) => o * 32);
  const cupX = useTransform(offset, (o) => o * width * 0.14);
  const cupRotate = useTransform(offset, (o) => o * -10);
  const cupScale = useTransform(offset, (o) => 1 - Math.min(Math.abs(o), 1) * 0.16);
  const infoOpacity = useTransform(offset, (o) => 1 - clamp(0, 1, (Math.abs(o) - 0.2) * 1.6));

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    if (e.target.matches(":focus-visible")) onKeyboardFocus(index);
  };

  return (
    <article
      aria-labelledby={headingId}
      onFocus={onFocus}
      className="relative h-full shrink-0"
      style={{ width, color: ink }}
    >
      <motion.p
        aria-hidden
        className="hero-display pointer-events-none absolute top-[30%] left-1/2 -translate-1/2 leading-none whitespace-nowrap uppercase select-none will-change-transform md:top-1/2"
        style={{
          x: wordX,
          opacity: wordOpacity,
          fontSize: Math.min((width * 1.7) / word.length, stageHeight * 0.5),
        }}
      >
        {word}
      </motion.p>

      <div className="absolute inset-x-0 top-[3svh] flex justify-center md:inset-y-0 md:top-0 md:left-[30%] md:items-center">
        <div className="relative aspect-1/2 h-[min(64svh,140vw)] md:h-[min(80svh,62vw)]">
          <motion.div
            aria-hidden
            className="absolute top-1/2 left-1/2 w-[170%] -translate-1/2 will-change-transform"
            style={{ x: splashX, rotate: splashRotate, opacity: presence }}
          >
            <HeroImage file={item.splash} alt="" className="w-full select-none" />
          </motion.div>
          <motion.div
            className="relative size-full will-change-transform"
            style={{ x: cupX, rotate: cupRotate, scale: cupScale }}
          >
            <HeroImage file={item.cup} alt="" className="size-full object-cover select-none" />
          </motion.div>
        </div>
      </div>

      <motion.div
        className="absolute inset-x-6 bottom-[15svh] md:inset-x-auto md:top-1/2 md:bottom-auto md:left-[7%] md:w-[min(20rem,36%)] md:-translate-y-1/2"
        style={{ opacity: infoOpacity }}
      >
        <FlavorInfo item={item} index={index} headingId={headingId} ink={ink} />
      </motion.div>
    </article>
  );
}
