import type { CSSProperties } from "react";
import { CREAM, CREMA, ESPRESSO } from "../theme";
import { POUR_MS } from "./loader.config";
import "./loader.css";

/*
 * Scene coordinates. The cup is drawn where it finally rests, on the left, and
 * the thermos stands on the same table line (y 238) to its right. The viewBox
 * is centered on that pair, with room above for the thermos to lift and pour.
 */
const VIEW_BOX = "15 -165 420 606";
const SCENE_CENTER = { x: 225, y: 138 };

/**
 * Cup geometry. The body is a closed outline: straight sides down to a rounded
 * bowl with a flat base, and the rim drawn as a solid bar. It starts mid-rim,
 * where the line is straight: a start/end point on a corner would leave that
 * corner unjoined while the outline draws itself.
 */
const CUP = "M140 30H240V130C240 195 200 238 168 238H112C80 238 40 195 40 130V30Z";
const HANDLE = "M240 58H262Q290 58 290 88V102C290 138 268 160 236 163";
/** Glint on the left wall: a band that follows the bowl and tapers to a point. */
const GLINT = "M66 46H94V128C94 170 112 200 132 212C98 206 66 172 66 128Z";
/** Middle of the cup with its handle and shadow, the point it's scaled about. */
const CUP_CENTER = { x: 165, y: 138 };

/** The cup first appears this much bigger, centered on the scene, then shrinks to where it rests. */
const CUP_BIG_SCALE = 1.75;
const CUP_BIG = `translate(${SCENE_CENTER.x - CUP_BIG_SCALE * CUP_CENTER.x}px, ${
  SCENE_CENTER.y - CUP_BIG_SCALE * CUP_CENTER.y
}px) scale(${CUP_BIG_SCALE})`;

/** Where the coffee's surface settles. */
const SURFACE_Y = 95;

/**
 * Coffee surface at y = 0: one wave per 200 units (the cup's width), three
 * periods long so sliding it by one period loops seamlessly.
 */
const WAVE = "M-160 0q50 -14 100 0t100 0t100 0t100 0t100 0t100 0V320H-160Z";
/** Thickness of the crema band riding on the surface. */
const CREMA_DEPTH = 6;

/** Both the coffee and the stream's cut-off ride the same rising level. */
const LEVEL_STYLE = { "--surface-y": `${SURFACE_Y}px` } as CSSProperties;

/** The thermos's place and tilt; its own origin is the middle of its body. */
interface Pose {
  x: number;
  y: number;
  tilt: number;
}

/** Standing beside the cup, base on the table line. */
const STAND: Pose = { x: 352, y: 142, tilt: 0 };
/** Slides in to STAND from a little further right. */
const ENTER: Pose = { ...STAND, x: STAND.x + 60 };
/** On the way up and back: high enough to swing clear of the cup's handle. */
const LIFT: Pose = { x: 345, y: -5, tilt: -35 };
/** Tipped over the cup, spout down, handle up. */
const POUR: Pose = { x: 267, y: -79, tilt: -100 };

function poseTransform({ x, y, tilt }: Pose): string {
  return `translate(${x}px, ${y}px) rotate(${tilt}deg)`;
}

const POSE_STYLE = {
  "--thermos-enter": poseTransform(ENTER),
  "--thermos-stand": poseTransform(STAND),
  "--thermos-lift": poseTransform(LIFT),
  "--thermos-pour": poseTransform(POUR),
} as CSSProperties;

/**
 * The lip's axis, in the thermos's own coordinates: where it leaves the neck
 * and its tip. The stream starts inside and runs out through the tip, so it
 * emerges from under the lip at full width.
 */
const LIP_ROOT = { x: -30, y: -99 };
const LIP_TIP = { x: -45, y: -105 };

/** A point on the thermos, in scene coordinates, while it holds `pose`. */
function atPose(point: { x: number; y: number }, pose: Pose) {
  const a = (pose.tilt * Math.PI) / 180;
  return {
    x: pose.x + point.x * Math.cos(a) - point.y * Math.sin(a),
    y: pose.y + point.x * Math.sin(a) + point.y * Math.cos(a),
  };
}

/** The stream ends just above the cup's base; below the surface it's cut away. */
const STREAM_BOTTOM = 232;
/**
 * The cut sits just below the lowest trough of the espresso (crema band plus
 * the wave's ±7), so the stream meets the coffee without drawing over it.
 */
const STREAM_CUT_DEPTH = CREMA_DEPTH + 8;
/** Top of the cut-off window: anywhere above the spout. */
const STREAM_CLIP_TOP = -400;

function streamPath(): string {
  const root = atPose(LIP_ROOT, POUR);
  const tip = atPose(LIP_TIP, POUR);
  const at = (dx: number, dy: number) => `${(tip.x + dx).toFixed(1)} ${(tip.y + dy).toFixed(1)}`;
  // Leaves the tip along the lip, then bends into a straight fall.
  return `M${root.x.toFixed(1)} ${root.y.toFixed(1)}L${at(0, 0)}C${at(-1.5, 7)} ${at(-2.5, 14)} ${at(-2.5, 26)}V${STREAM_BOTTOM}`;
}

/** Resting opacity of a layer that fades in; the animation can't read an attribute. */
function fadeTo(opacity: number): CSSProperties {
  return { "--fade-to": opacity } as CSSProperties;
}

/** Thermos body, the part its bands and shading are clipped to. */
const THERMOS_BODY = { x: -40, y: -50, width: 80, height: 146, rx: 14 };
/** Shoulder narrowing into the neck, under a domed lid; it overlaps the body's top. */
const THERMOS_TOP =
  "M-40 -40C-40 -62 -30 -72 -24 -78V-100Q-24 -112 -12 -114H12Q24 -112 24 -100V-78C30 -72 40 -62 40 -40Z";
/** Pouring lip on the left of the neck: it points down once the thermos tips over the cup. */
const THERMOS_LIP = "M-24 -104L-43 -109Q-47 -105 -44 -101L-24 -88Z";
const THERMOS_HANDLE = "M40 -30H54Q66 -30 66 -18V44Q66 56 54 56H40";

/**
 * A coffee thermos in flat colors, drawn upright around the middle of its body:
 * cream body with a coffee bean on it, espresso lid, lip, handle and base.
 */
function Thermos() {
  return (
    <>
      <path d={THERMOS_HANDLE} fill="none" stroke={ESPRESSO} strokeWidth="9" />
      <g clipPath="url(#pour-thermos-body)">
        <rect {...THERMOS_BODY} rx={0} fill={CREAM} />
        <rect x="-40" y="82" width="80" height="14" fill={ESPRESSO} />
        <rect x="20" y="-50" width="20" height="146" fill={ESPRESSO} opacity="0.1" />
        <rect x="-30" y="-34" width="6" height="104" rx="3" fill="#FFFFFF" opacity="0.7" />
      </g>
      <g transform="translate(0 22) rotate(20)">
        <ellipse rx="11" ry="15" fill={ESPRESSO} />
        <path d="M0 -13C6 -5 -6 5 0 13" fill="none" stroke={CREAM} strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <path d={THERMOS_TOP} fill={ESPRESSO} />
      <path d={THERMOS_LIP} fill={ESPRESSO} />
      <rect x="-24" y="-99" width="48" height="2.5" fill={CREAM} opacity="0.5" />
    </>
  );
}

/**
 * The loader scene, in the brand colors: a glass cup draws itself big and
 * shrinks into place, a thermos slides in beside it, tips over and pours it
 * full of espresso with crema on top, then stands back down.
 */
export default function PouringCup() {
  return (
    <svg
      viewBox={VIEW_BOX}
      aria-hidden="true"
      className="pour max-h-[94svh] w-[min(88vw,25rem)] overflow-visible"
      style={{ "--pour-ms": `${POUR_MS}ms` } as CSSProperties}
    >
      <defs>
        <clipPath id="pour-cup-clip">
          <path d={CUP} />
        </clipPath>
        <clipPath id="pour-stream-clip">
          <rect
            className="pour-level"
            style={LEVEL_STYLE}
            x="-100"
            y={STREAM_CLIP_TOP}
            width="600"
            height={-STREAM_CLIP_TOP + STREAM_CUT_DEPTH}
          />
        </clipPath>
        <clipPath id="pour-thermos-body">
          <rect {...THERMOS_BODY} />
        </clipPath>
      </defs>

      <ellipse
        className="pour-thermos-shadow"
        style={fadeTo(0.14)}
        cx={STAND.x}
        cy="243"
        rx="50"
        ry="6"
        fill={ESPRESSO}
      />

      <g className="pour-cup" style={{ "--cup-big": CUP_BIG } as CSSProperties}>
        <ellipse className="pour-fade" style={fadeTo(0.14)} cx="140" cy="243" rx="112" ry="7" fill={ESPRESSO} />

        <path className="pour-fade" style={fadeTo(0.12)} d={CUP} fill={CREAM} />

        <g clipPath="url(#pour-cup-clip)">
          <g className="pour-level" style={LEVEL_STYLE}>
            <g className="pour-wave">
              <path d={WAVE} fill={CREMA} />
              <path d={WAVE} fill={ESPRESSO} transform={`translate(0 ${CREMA_DEPTH})`} />
            </g>
          </g>
        </g>

        <g fill="none" stroke={CREAM} strokeWidth="9" strokeLinejoin="miter">
          <path className="pour-draw" d={HANDLE} pathLength={1} />
          <path className="pour-draw" d={CUP} pathLength={1} />
        </g>

        <path className="pour-fade" style={fadeTo(0.35)} d={GLINT} fill={CREAM} />
      </g>

      <g clipPath="url(#pour-stream-clip)">
        <path className="pour-stream" d={streamPath()} pathLength={1} fill="none" stroke={ESPRESSO} strokeWidth="10" />
      </g>

      <g className="pour-thermos" style={POSE_STYLE}>
        <Thermos />
      </g>
    </svg>
  );
}
