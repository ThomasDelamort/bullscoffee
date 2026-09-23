import type { CSSProperties } from "react";
import FloatingBeans from "./FloatingBeans";
import HeroImage from "./HeroImage";
import { HERO_FLAVORS } from "./hero.config";

interface CoffeeShowcaseProps {
  step: number;
  reduceMotion: boolean;
}

const COUNT = HERO_FLAVORS.length;
const SLOT_DEG = 360 / COUNT;
// Vertical reach of the back-most slot, (1 - cos θ)², so the wheel CSS can
// park those cups at the top edge whatever the flavor count.
const BACK_REACH = Math.max(
  (1 - Math.cos((Math.floor(COUNT / 2) * SLOT_DEG * Math.PI) / 180)) ** 2,
  1,
);

interface WheelProps {
  step: number;
  /** Snap to the new arrangement instead of turning to it. */
  still?: boolean;
  /** Hidden from assistive tech (the outgoing layer of a crossfade). */
  decorative?: boolean;
  className?: string;
}

/** All cups on the wheel, turned so flavor `step % count` is center stage. */
function Wheel({ step, still = false, decorative = false, className = "" }: WheelProps) {
  const active = step % COUNT;

  return (
    <div
      aria-hidden={decorative || undefined}
      className={`hero-wheel ${still ? "hero-wheel-still" : ""} ${className}`}
      style={
        {
          "--hero-turn": `${step * SLOT_DEG}deg`,
          "--hero-count": COUNT,
          "--wheel-back-reach": BACK_REACH,
        } as CSSProperties
      }
    >
      {HERO_FLAVORS.map((flavor, i) => (
        <div
          key={flavor.id}
          aria-hidden={i !== active || undefined}
          className="hero-wheel-cup h-(--cup-frame-h) aspect-(--cup-box-aspect)"
          style={{ "--slot": `${-i * SLOT_DEG}deg` } as CSSProperties}
        >
          <HeroImage
            file={flavor.cup}
            alt={i === active ? flavor.name : ""}
            labelPlaceholder
            fetchPriority={i === 0 ? "high" : "auto"}
            className="size-full object-cover select-none"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The product stage, anchored on the center cup: the bean cluster behind, then
 * the cups. With full motion the wheel turns clockwise one slot per step (the
 * next flavor swings in from the right). With reduced motion the same layout
 * is shown, but each new arrangement crossfades in place of the last.
 */
export default function CoffeeShowcase({ step, reduceMotion }: CoffeeShowcaseProps) {
  return (
    <div className="pointer-events-none absolute top-(--scene-y) left-1/2 z-30 size-0">
      <FloatingBeans className="z-50" />

      {reduceMotion ? (
        <>
          <Wheel step={step} still />
          {step > 0 && (
            <Wheel
              key={step}
              step={step - 1}
              still
              decorative
              className="absolute top-0 left-0 z-150 animate-[hero-fade-out_var(--hero-dur)_var(--hero-ease)_forwards]"
            />
          )}
        </>
      ) : (
        <Wheel step={step} />
      )}
    </div>
  );
}
