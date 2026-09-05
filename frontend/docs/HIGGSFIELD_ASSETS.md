# Higgsfield motion plates

## Status

**Not rendered.** All four jobs were rejected at submission:

```
Submitted 0/4 video generations.
- index 0: submission_failed — Preset "IN THE DARK" was recommended instead of
           submitting a job. Retry with declined_preset_id=24bae836-2c4a-48e0-89b6-49fcc0b21612.
- index 1: submission_failed — Requires plus plan or higher.
- index 2: submission_failed — Requires plus plan or higher.
- index 3: submission_failed — Requires plus plan or higher.
```

Workspace state at the time: `Credits: 10 | Plan: free`. Seedance 2.5 needs
Plus or above, so `src/data/motionAssets.ts` still has `url: null` on every
entry and the hero runs on the vector fallback in `components/BeanField.tsx`.

Index 0 failed for a different reason — the server offered a style preset
instead of submitting. The payload below already carries the
`declined_preset_id` needed to push past it on the retry.

## Why blend modes instead of transparent video

Text-to-video models do not produce an alpha channel. Rather than fake it with
a rotoscope pass, each plate is rendered against a flat matte and keyed in CSS:

| Plate          | Matte          | CSS                        | Reason                                                              |
| -------------- | -------------- | -------------------------- | ------------------------------------------------------------------- |
| Coffee beans   | pure **white** | `mix-blend-mode: multiply` | Beans are dark. Multiply keeps dark pixels, drops white to nothing. |
| Steam / swirls | pure **black** | `mix-blend-mode: screen`   | Steam is light. Screen keeps light pixels, drops black to nothing.  |

This is why the prompts insist so heavily on a flat background — a gradient or
a visible studio floor leaves a grey haze once the plate is composited.

The hero stage sets `isolate` so the blend cannot reach past the section.

## Asset budget

Five flavors do **not** need five swirl renders. The `neutral` white plate is
tinted per flavor by a `mix-blend-mode: multiply` overlay using
`flavor.glow`, so one render covers Strawberry, Mocha and Java Chip. Matcha
and Turmeric Mango were called out by name in the brief and get dedicated
pre-coloured renders, because a green tint over white steam reads flatter than
steam that was lit green in the first place.

That is 3 swirl renders instead of 5, plus 1 bean plate. Four jobs total.

## Payloads

Run as a single `generate_video_batch` call. Model constraints confirmed via
`models_explore(action="get", model_id="seedance_2_5")`: duration 4–30s,
resolution `480p|720p|1080p`, aspect ratios include `16:9`.

`generate_audio` is `false` throughout — these are silent background plates.

```json
{
  "requests": [
    {
      "index": 0,
      "params": {
        "model": "seedance_2_5",
        "mode": "t2v",
        "declined_preset_id": "24bae836-2c4a-48e0-89b6-49fcc0b21612",
        "prompt": "Macro product shot of roasted coffee beans floating and slowly tumbling in mid-air against a completely flat pure white seamless studio background. Beans drift gently upward and rotate in slow motion at varying depths, some sharply in focus in the foreground, others softly blurred with shallow depth-of-field bokeh. Soft even diffused studio lighting, no visible shadows cast on the background, no surfaces, no table, no hands, no text. Locked static camera, no camera movement, no cuts, continuous single take, subtle looping motion, high-end commercial advertising cinematography, clean isolated subject on white.",
        "duration": 5,
        "resolution": "1080p",
        "aspect_ratio": "16:9",
        "generate_audio": false,
        "bitrate_mode": "high"
      }
    },
    {
      "index": 1,
      "params": {
        "model": "seedance_2_5",
        "mode": "t2v",
        "prompt": "Abstract wisps of soft white vapour and delicate steam swirls rising slowly upward against a completely flat pure black void background. Elegant translucent tendrils curl and dissipate in slow motion, backlit so the steam glows soft neutral white, gentle organic turbulence, volumetric haze, shallow depth of field. Nothing else in frame, no cup, no objects, no people, no text. Locked static camera, no camera movement, no cuts, continuous single take, seamless looping ambient texture, cinematic macro photography on pure black.",
        "duration": 5,
        "resolution": "1080p",
        "aspect_ratio": "16:9",
        "generate_audio": false,
        "bitrate_mode": "high"
      }
    },
    {
      "index": 2,
      "params": {
        "model": "seedance_2_5",
        "mode": "t2v",
        "prompt": "Abstract ambient swirls of luminous matcha green mist and jade-toned vapour drifting slowly upward against a completely flat pure black void background. Soft glowing tendrils of pale green smoke curl, fold and dissipate in slow motion, backlit with a gentle emerald glow, volumetric haze, shallow depth of field, subtle bokeh particles. Nothing else in frame, no cup, no objects, no people, no text. Locked static camera, no camera movement, no cuts, continuous single take, seamless looping ambient texture on pure black.",
        "duration": 5,
        "resolution": "1080p",
        "aspect_ratio": "16:9",
        "generate_audio": false,
        "bitrate_mode": "high"
      }
    },
    {
      "index": 3,
      "params": {
        "model": "seedance_2_5",
        "mode": "t2v",
        "prompt": "Abstract ambient swirls of warm golden amber mist and honey-toned turmeric vapour drifting slowly upward against a completely flat pure black void background. Soft glowing tendrils of luminous gold smoke curl, fold and dissipate in slow motion, backlit with a warm sunlit glow, floating golden dust motes, volumetric haze, shallow depth of field. Nothing else in frame, no cup, no objects, no people, no text. Locked static camera, no camera movement, no cuts, continuous single take, seamless looping ambient texture on pure black.",
        "duration": 5,
        "resolution": "1080p",
        "aspect_ratio": "16:9",
        "generate_audio": false,
        "bitrate_mode": "high"
      }
    }
  ]
}
```

Then poll and collect the URLs:

```json
// jobs_wait
{
  "jobs": [
    { "index": 0, "job_id": "<from batch response>" },
    { "index": 1, "job_id": "<from batch response>" },
    { "index": 2, "job_id": "<from batch response>" },
    { "index": 3, "job_id": "<from batch response>" }
  ],
  "timeout_seconds": 15
}
```

## Wiring the results in

1. Download the four MP4s into `public/motion/` as `beans.mp4`,
   `swirl-neutral.mp4`, `swirl-matcha.mp4`, `swirl-turmeric.mp4`.
2. Set the `url` fields in `src/data/motionAssets.ts`:

```ts
export const BEANS: MotionAsset = {
  url: "/motion/beans.mp4",
  blend: "multiply",
  note: "...",
};

export const SWIRLS: Record<SwirlKey, MotionAsset> = {
  neutral: { url: "/motion/swirl-neutral.mp4", blend: "screen", note: "..." },
  matcha: { url: "/motion/swirl-matcha.mp4", blend: "screen", note: "..." },
  turmeric: { url: "/motion/swirl-turmeric.mp4", blend: "screen", note: "..." },
};
```

Nothing else changes. `MotionLayer` reads the registry and swaps the video in
for the fallback on its own.

## Post-processing worth doing

The raw renders will not loop cleanly — 5 seconds of generated video almost
never returns to its first frame. Before shipping:

```bash
# Crossfade the tail into the head to hide the seam
ffmpeg -i beans.mp4 -filter_complex \
  "[0]split[a][b];[a]trim=0:4,setpts=PTS-STARTPTS[main];\
   [b]trim=4:5,setpts=PTS-STARTPTS[tail];\
   [main][tail]xfade=transition=fade:duration=1:offset=3" \
  -an beans-loop.mp4

# Ship a VP9 sibling; it is meaningfully smaller for soft, low-detail plates
ffmpeg -i beans-loop.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -an beans-loop.webm
```

Serve the WebM first with an MP4 fallback if bandwidth matters — Cebu mobile
traffic will notice a 6 MB hero plate.
