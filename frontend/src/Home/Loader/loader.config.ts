/**
 * Home loader: everything tunable about the pour's timing lives here.
 * The keyframes in ./loader.css are percentages of POUR_MS, so changing it
 * stretches the whole sequence without touching the CSS.
 */

/**
 * The whole scene, played once: the cup draws itself big and shrinks into
 * place, a thermos pours it full, then sets back down beside it.
 */
export const POUR_MS = 3400;
/** Shortest the loader stays up: the scene already ends on a short hold. */
export const MIN_VISIBLE_MS = POUR_MS;
/** With reduced motion there is no pour, only the finished scene, so don't hold it long. */
export const MIN_VISIBLE_REDUCED_MS = 500;
/** Slow connection or a missing image: reveal the page anyway after this long. */
export const MAX_WAIT_MS = 8000;
/** Fade from the loader to the page. */
export const EXIT_MS = 600;
