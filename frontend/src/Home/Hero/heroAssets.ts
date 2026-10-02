import type { HeroAssetFile } from './hero.config';

/** Whatever is currently in ./assets; files added later are picked up automatically. */
const ASSET_URLS = import.meta.glob<string>('./assets/*.{png,webp,avif,jpg,jpeg,svg}', {
  eager: true,
  import: 'default',
});

/** URL of a file in ./assets, or undefined while it's missing. */
export function heroAssetUrl(file: HeroAssetFile): string | undefined {
  return ASSET_URLS[`./assets/${file}`];
}
