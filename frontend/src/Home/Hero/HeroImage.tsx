import type { ImgHTMLAttributes } from 'react';
import type { HeroAssetFile } from './hero.config';

/** Whatever is currently in ./assets; files added later are picked up automatically. */
const ASSET_URLS = import.meta.glob<string>('./assets/*.{png,webp,avif,jpg,jpeg,svg}', {
  eager: true,
  import: 'default',
});

const PLACEHOLDER_SHAPES = {
  card: 'rounded-3xl',
  oval: 'aspect-[4/3] rounded-[50%]',
  circle: 'rounded-full',
} as const;

interface HeroImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  file: HeroAssetFile;
  /** Empty string for decorative images. */
  alt: string;
  placeholderShape?: keyof typeof PLACEHOLDER_SHAPES;
  /** Shows the expected file name inside the placeholder. */
  labelPlaceholder?: boolean;
}

/** Renders an image from ./assets, or a labeled placeholder while the file is missing. */
export default function HeroImage({
  file,
  alt,
  placeholderShape = 'card',
  labelPlaceholder = false,
  className = '',
  style,
  ...imgProps
}: HeroImageProps) {
  const src = ASSET_URLS[`./assets/${file}`];

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        draggable={false}
        decoding="async"
        className={className}
        style={style}
        {...imgProps}
      />
    );
  }

  return (
    <div
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      title={`Missing asset: src/Home/Hero/assets/${file}`}
      className={`${className} ${PLACEHOLDER_SHAPES[placeholderShape]} flex flex-col items-center justify-center gap-1 border-2 border-dashed border-current/45 bg-current/5 p-2 text-center`}
      style={style}
    >
      {labelPlaceholder && (
        <>
          <span className="font-mono text-sm font-semibold">{file}</span>
          <span className="text-xs opacity-75">{alt}</span>
          <span className="font-mono text-[10px] opacity-60">src/Home/Hero/assets/</span>
        </>
      )}
    </div>
  );
}
