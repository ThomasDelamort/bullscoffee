const ROWS = 20;
const WORDS_PER_ROW = 14;
const ROW_TEXT = Array.from({ length: WORDS_PER_ROW }, () => 'Coffee').join(' ');

/**
 * Tiled, tilted "COFFEE" pattern behind everything. Oversized so the rotated
 * block still covers ultrawide and tall phone viewports; its color is a tone
 * of the current background and tweens along with it.
 */
export default function CoffeeWatermark({ color }: { color: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden transition-colors duration-(--hero-dur) ease-(--hero-ease) select-none"
      style={{ color }}
    >
      <div className="hero-display absolute top-1/2 left-1/2 flex -translate-1/2 -rotate-22 flex-col gap-[0.12em] text-[max(9cqh,3.25rem)] leading-none whitespace-nowrap uppercase">
        {Array.from({ length: ROWS }, (_, row) => (
          <span key={row} className="even:-translate-x-[1.4em]">
            {ROW_TEXT}
          </span>
        ))}
      </div>
    </div>
  );
}
