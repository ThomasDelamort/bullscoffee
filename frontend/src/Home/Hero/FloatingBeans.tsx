import type { CSSProperties } from 'react';
import HeroImage from './HeroImage';
import { BEAN_IMAGES, BEANS } from './hero.config';

interface FloatingBeansProps {
  layer: 'back' | 'front';
  className?: string;
}

/**
 * One layer of the bean field, positioned around the center cup in cup
 * heights. The idle drift only runs when the user hasn't asked for reduced
 * motion; timings are staggered per bean so they never move in lockstep.
 */
export default function FloatingBeans({ layer, className = '' }: FloatingBeansProps) {
  return (
    <div aria-hidden="true" className={`absolute top-0 left-0 ${className}`}>
      {BEANS.map((bean, i) => {
        if (bean.layer !== layer) return null;

        const drift = {
          left: `calc(${bean.x} * var(--cup-h))`,
          top: `calc(${bean.y} * var(--cup-h))`,
          width: `calc(${bean.size} * var(--cup-h))`,
          '--float-dur': `${5.5 + (i % 4) * 0.9}s`,
          '--float-delay': `${-i * 1.3}s`,
          '--float-y': `calc(var(--cup-h) * ${-0.018 - (i % 3) * 0.008})`,
          '--float-rot': `${(i % 2 ? 1 : -1) * (5 + (i % 3) * 3)}deg`,
        } as CSSProperties;

        return (
          <div
            key={i}
            className="absolute motion-safe:animate-[hero-bean-float_var(--float-dur)_ease-in-out_var(--float-delay)_infinite]"
            style={drift}
          >
            <HeroImage
              file={BEAN_IMAGES[(bean.variant ?? 0) % BEAN_IMAGES.length]}
              alt=""
              placeholderShape="oval"
              className="w-full -translate-1/2 select-none"
              style={{
                rotate: `${bean.rotate}deg`,
                filter: bean.blur ? `blur(${bean.blur}px)` : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
