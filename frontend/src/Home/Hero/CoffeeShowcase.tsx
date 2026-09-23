import type { CSSProperties } from 'react';
import FloatingBeans from './FloatingBeans';
import HeroImage from './HeroImage';
import { HERO_FLAVORS, type HeroFlavor } from './hero.config';

interface CoffeeShowcaseProps {
  step: number;
  reduceMotion: boolean;
}

const CUP_BOX = 'h-(--cup-h) aspect-(--cup-aspect)';

function CupImage({ flavor, isActive, isFirst }: { flavor: HeroFlavor; isActive: boolean; isFirst: boolean }) {
  return (
    <HeroImage
      file={flavor.cup}
      alt={isActive ? flavor.name : ''}
      labelPlaceholder
      fetchPriority={isFirst ? 'high' : 'auto'}
      className="size-full object-contain select-none"
    />
  );
}

/**
 * The product stage, anchored on the center cup: back beans, the cups, then
 * front beans. With full motion the cups ride a wheel that turns clockwise one
 * slot per step (the next flavor swings in from the right); with reduced
 * motion only the center cup is shown and flavors crossfade in place.
 */
export default function CoffeeShowcase({ step, reduceMotion }: CoffeeShowcaseProps) {
  const count = HERO_FLAVORS.length;
  const active = step % count;
  const slotDeg = 360 / count;
  // Vertical reach of the back-most slot, (1 - cos θ)², so the wheel CSS can
  // park those cups at the top edge whatever the flavor count.
  const backAngle = (Math.floor(count / 2) * slotDeg * Math.PI) / 180;
  const backReach = Math.max((1 - Math.cos(backAngle)) ** 2, 1);

  return (
    <div className="pointer-events-none absolute top-(--scene-y) left-1/2 z-30 size-0">
      <FloatingBeans layer="back" className="z-50" />

      {reduceMotion ? (
        HERO_FLAVORS.map((flavor, i) => (
          <div
            key={flavor.id}
            aria-hidden={i !== active}
            className={`${CUP_BOX} absolute top-0 left-0 z-100 -translate-1/2 transition-opacity duration-(--hero-dur) ease-(--hero-ease)`}
            style={{ opacity: i === active ? 1 : 0 }}
          >
            <CupImage flavor={flavor} isActive={i === active} isFirst={i === 0} />
          </div>
        ))
      ) : (
        <div
          className="hero-wheel"
          style={
            {
              '--hero-turn': `${step * slotDeg}deg`,
              '--hero-count': count,
              '--wheel-back-reach': backReach,
            } as CSSProperties
          }
        >
          {HERO_FLAVORS.map((flavor, i) => (
            <div
              key={flavor.id}
              aria-hidden={i !== active}
              className={`hero-wheel-cup ${CUP_BOX}`}
              style={{ '--slot': `${-i * slotDeg}deg` } as CSSProperties}
            >
              <CupImage flavor={flavor} isActive={i === active} isFirst={i === 0} />
            </div>
          ))}
        </div>
      )}

      <FloatingBeans layer="front" className="z-200" />
    </div>
  );
}
