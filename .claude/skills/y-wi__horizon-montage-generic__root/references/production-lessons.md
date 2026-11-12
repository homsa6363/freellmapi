# Production lessons (append as you learn)

Each entry: what happened, then the rule it led to.

Note: some later entries mention helper scripts written for one project (`deband_sky.py`,
`register_clips.py`, `paste_plaque.py`, `src/Element.tsx`, `apex.plan` keyframes, alternate
scores). They are **not** part of this template; treat them as recipes to rebuild if needed.

## From the first film (brand film for an image app, "Every word becomes a world", 2026-10-17)

**Reference analysis**
- Contact sheets at 2 fps plus `ffmpeg select='gt(scene,0.15)'` found all 38 cuts.
  The reading that mattered came from looking at 5 fps strips of one phase and
  from 1920 px crops of the type. Those showed the text bending along the arc,
  growing, flipping ink, and sitting under the grain. Always crop the type at full
  resolution. The thumbnails hide the craft.
- Run the arc detector on the reference frames as well (`analyze_reference.py`
  does this), so you get the target apex/sagitta as numbers.
  Reference: apex 0.474 H, sagitta 0.143 H.
- The reference had no audio track. Design the sound from the cut structure,
  and say so in the delivery note.

**Generation**
- Four parallel jobs overran the provider's per-account concurrency cap and most were
  rejected as busy. Rule: keep `--jobs` at the provider's cap and resubmit busy rejections
  (`gen_shots.py` retries failed shots).
- 39 generations for 34 shots. Measure cost from the balance before and after the whole
  batch, not from the first job. Budget about 1.2 × the shot count.
- Generated 16:9 frames sometimes carry 3–5 px black lines at the top/bottom.
  They broke the calm-sky test and would flash at every cut. Rule: always trim borders
  before analysis (`trim_borders`).
- The model places the horizon higher than asked (median ~0.40 H). Don't fight it
  in the prompt. Extend the sky in registration.

**Registration**
- Column-wise step edge (colour + luminance, minus a penalty for texture just above),
  taking the *topmost* strong edge, then an iteratively trimmed parabola fit. This worked
  first try on photos. It needed `minY` for a figure above the ground (the horse) and
  is weaker on thin line art.
- Zooming in to push a high horizon down costs resolution (up to 1.8× → soft).
  Extending a calm sky upward (per-column colour from the top band + matched noise +
  a 28 px blend) costs nothing, and grain hides the seam. Matching curvature
  still needs some zoom. Cap the total at ~1.6× cover.
- Ink decision: mean luminance of the title box in output coordinates; dark ink above
  0.6. Saturated mid-tones (turquoise, orange dusk at 0.55–0.6) read better with
  light ink plus a dark halo.

**Picture (Remotion)**
- Draw the planet limb in code (a radial gradient with ring stops sampled from the
  reference, blurred 5 px). The bookends can then move freely and the loop seam is
  pixel-exact. A `dawn` 0..1 parameter blends the night and sunrise palettes for the tilt.
- Title on an SVG `<textPath>` along a circle concentric with the horizon keeps
  kerning intact. The "word → world" morph is a `<tspan>` for the new letter
  whose `letter-spacing` animates from −advance to 0 (advance measured with canvas
  `measureText` after the font loads), while `text-anchor="middle"` re-centres the word.
- `interpolate()` needs an increasing input range. Negate the value instead of
  writing a decreasing range.
- Font: load the TTF with `@remotion/fonts` `loadFont()` (see the late fixes below for
  why not a hand-rolled `FontFace`). Re-render after it loads (`useFontReady`) so canvas
  measurements use real metrics.

**Sound**
- You can't listen, so look: a log-frequency spectrogram with cut ticks plus an RMS
  curve (`score_check.py`). The first version's "drop" at the resolve only fell 8 dB
  because the pad kept 15% gain and the boom was loud. Gate pads to 0 at the drop,
  start the end chord 0.35 s later with a slow attack, and keep the boom sub-only.
- An HF hiss "air" bed needs two cascaded low-pass poles, or it reads as noise.

**Late fixes from QA on the rendered film**
- Bumpy rims (lace scallops, agate crust, feather fibres, towers on a planet) poke
  above the *mean* parabola, and the title collided with the agate. Rule: register the
  **upper envelope** near the centre (apex lifted by the 8th-percentile residual of
  the edge points under the title; `lift` in `registration.json`), plus a title gap
  of 0.028 H. Smooth subjects lift by 2–5 px, bumpy ones by 17–80 px.
- When a subject keeps producing a non-arc silhouette after one prompt rewrite (origami
  → zigzag both times), replace the subject; don't fight it. A cloud dome on mint
  fixed the slot first try.
- For thin line art the detector finds the texture rather than the line. Draw pixel
  ticks on the raw image, read the apex and one side point, and override
  `apex` + `a` (a = Δy / Δx²).
- The module-level `FontFace` + `delayRender` worked for stills but timed out in the full
  4-tab render. Rule: load fonts with `@remotion/fonts` `loadFont()` and render with
  `--timeout=90000`.
- Render speed: 587 frames at 1080p in ~37 s (concurrency 4). The grain makes the CRF-16
  master heavy (~70 MB for 23 s). Ship a web copy at CRF 23 with `+faststart` (~14 MB).
- Total for the first film was about 2 h: analysis 15 min, concept and shots 15 min,
  generation 25 min (in the background), code and score 40 min, QA and fixes 20 min.
  With this template, expect about 1 h, mostly generation time.

## Other anchors

**"Look up" sky-opening anchor (samples for a 立秋 / Start-of-Autumn teaser, 2026-10-18)**
- Template that worked first try on 5/5: worm's-eye view, "{frame} close in from all four
  edges and converge toward the center, leaving ONE soft, roughly round opening of sky
  exactly in the middle, about one third of the image height across", plus "no birds,
  no aircraft, no sun disc inside the opening". Prompts live in
  that project's `data/shotlist.json`.
- Measured anchor (centroid of the brightest 8% after blur): 4 of 5 within 3% of frame
  centre; the lotus came out at (0.45, 0.56). A centroid + radius registration is enough,
  with no curve fitting.
- The "single turned leaf" seasonal cue rendered clearly on plane and ginkgo canopies, and
  on lotus as a browning leaf edge. On bamboo it was lost. Name one large, specific leaf
  near the rim rather than "a few tips".
- Architecture look-ups bend into fisheye-like octagons with warped windows (surreal,
  slightly CG). Fine as a stylised insert. For real institutions, use their photos.
- A centered anchor crops cleanly to 9:16. Check that the turned-leaf detail stays inside
  the vertical crop.

**Real photo as reference (campus film, 2026-10-18)**
- Passing a real campus photo as an image reference with "keep its real landmarks exactly as in
  Image 1" kept a clock tower and a round glass building recognisable (on a model that accepts
  image inputs).
- The words "small planet" / "tiny planet" in the subject made a fisheye tiny-planet image:
  arc depth about 0.29 H, roughly twice the target. Matching it needed about 1.8× zoom, which
  cropped the landmarks and left banding in the sky. Rule: for real places, ask for "a natural
  rectilinear wide lens, not fisheye, not a tiny-planet effect" and "the horizon of a very large
  planet". That gave a gentle 0.11 H arc on the first try.
- Buildings must stand ON the horizon, so put them in the outer thirds ("about one quarter of
  the way in from the left edge", "no taller than one sixth of the image height") and keep the
  middle third empty for the title. They sit inside the lift window and hijack the
  upper-envelope lift (−78 px). Rule: measure the lawn line in the centre third, then pin
  `apex` + `a` in overrides (the override also zeroes the lift).
- The first film's registered arcs ranged 0.08–0.20 H (median 0.15). A flatter real-place
  shot (~0.10) is within that range. Don't bend or warp a photo to force curvature.
- Colour/season variants: an image edit of the parent shot ("change only the colour/light … keep
  the exact shape and position of the curved horizon") kept the arc pixel-locked
  (orange-leaves and golden-hour variants). Reuse the parent shot's `apex`/`a` override as-is,
  and check by drawing that arc on the new image.
- The user preferred the fisheye tiny-planet look for their campus over the gentle registered
  arc, so taste can beat registration. Its edge is about 0.3 H deep, roughly twice the film's
  arc. Either give the whole film that curvature (raise `apex.sagitta`) or use it as a single
  hero or end-card world. Don't zoom it onto the shared arc: that crops the landmarks.
- Tiny-planet skies came out banded and blotchy in 3 of 3 generations, even with "no banding"
  in the prompt. A small `deband_sky.py` (project-specific, not included) smooths only clear sky. Use a strict
  sky test (b > 215, g > 150, b > r + 55), or hazy blue hills get smeared into the sky.
- On tiny planets, auto arc fits latch onto the tree line (wrong-sign curvature). For the title,
  read the apex (top of the distant trees) and the near-centre curvature from a pixel grid.
- Correction to the sky-cleanup rule above: a fixed colour threshold missed a deep-blue sky
  entirely (0% smoothed on the pavilion planet). `deband_sky.py` now flood-fills from the top
  edge through pixels that are smooth (local luminance step < 3.5 over 4 px; sky noise p99 is
  about 2.5, trees and hills about 17–22) and blue (b > r + 30). It closes 7 px pinholes before
  eroding. This held on 4 of 4 planets: hills, roofs, trees and reflecting ponds were left
  untouched. Compute gradients with edge padding, not `np.roll`, which wraps the top row onto
  the bottom.
- Steeper top-down tiny planets put the horizon too high (0.18 H on the amphitheater planet,
  against 0.25–0.31 for the rest of the set). After de-banding, grow the smooth sky upward with
  `register_horizons.extend_sky(img, pad)` and trim the same height from the foreground at the
  bottom. That gives a matching apex with no zoom and no visible seam (pad 127 px → 0.28 H).
- To make one landmark the hero of a tiny planet, size words alone ("about two fifths of the
  image height") left the canopy the same size in 2 of 2 takes. Moving the drone "much lower and
  much closer", with the landmark in the lower half of the frame, doubled it (0.16 → 0.33 of the
  width) in 2 of 2 takes. Pass the earlier good take as Image 2 ("layout and style reference")
  to keep what already worked, such as a full lake. Expect the horizon to rise and the hero to
  reach the bottom edge, which limits how far the sky can be extended.

## From the second film (university campus autumn film, 2026-10-18)

- Real photos as references: shots take `ref` (a file in `../photos`) plus a
  `refnote` naming what to take from it (the landmark, the material, the colour). Put real
  landmarks in a transformed medium (ink wash, blueprint, embroidery) or on a tiny planet with
  the landmark on the far slopes. 13 of 34 shots used photos, and all 34 came out usable on the
  first pass. Only 2 needed apex/a overrides: the blueprint's paper edge and a
  deep ink-wash dome.
- A provider-side quota error failed 33 of 34 shots in about 30 s. Check with one shot before
  rerunning the batch.
- Act names are free per film: `score.py` maps acts to the five musical roles by order.
- Image-to-video (first-frame mode, 2 s, 1080p, no audio) cost about seven stills per clip,
  so use it on 2–4 shots whose motion reads at 0.6–1 s
  (water, drifting leaves, bubbles). "Locked-off static camera … the curved top edge stays
  perfectly still" kept the arc fixed in 3 of 3 clips. Check the downloaded container/codec (it may
  arrive with a generic extension; here H.264 MP4, 1920×1080, 30 fps). A small `register_clips.py` (not included) maps it onto the registered still (trim offsets +
  skyPad) and feathers the top 60 px where the sky was extended, so there is no seam.
- End card for an institution: its name in text alone (no crest) at about 54 px, after a
  one-word beat at 88 px. The `size` per beat is in the config.

## Cut 2 of the campus film (2026-10-18): serve the images, then a director's structure

- **Excessive zoom came from the target sagitta, not from the shots.** the model drew the
  template's arc at a median sagitta of 0.226 at cover scale. The style bible's 0.15 forced a
  median 1.5× zoom and cropped 56% of every image. Measure the set's natural sagitta and use it
  as the target (0.22). Add `curvTolerance` (no zoom within 15%) and cap the extra zoom at
  1.12, which gave a median of 1.05×. Drop or regroup shots whose arcs are more than 30% off,
  rather than zooming them.
- **Landmarks must read, so keyframe the horizon.** Heroes with the building below or on the
  arc were pushed off the bottom when the arc was pinned at 0.47 H. `apex.plan` in the config,
  turned into `camera.apexKeys` by build_timeline, tilts the horizon to 0.30 H for the campus act
  and back up for the titles. Registration covers each shot only for the heights it visits
  (`shot_ranges`). Cuts still match because the height is continuous.
- **Hero prompts:** "the landmark stands ON TOP of the arc at the centre … top stays well below
  the top edge" plus "natural rectilinear wide lens, not fisheye". 4 of 4 kept the buildings
  recognisable. A flat-skyline result was fixed by a second pass with the first render as
  Image 2 and "change only the curvature" (sagitta 0.07 → 0.17, buildings upright).
- **Leaf cold open:** a whole leaf on black, keyed by luminance into public/leaf.png. Its fan
  edge has curvature a_leaf, so at scale a_leaf / a_arc the edge equals the shared arc. Rush the
  leaf in with an exponential scale and hard-cut to a leaf-edge world.
- **End titles on a hero with trees on the horizon:** lift them into clear sky (gap 0.2 H).
  Set a long institution name on a straight baseline, because curved, its ends dip into the
  treeline.
- **Rename trap:** score2 keys chords and melody by shot id, so renaming a shot (h05 → h05b)
  silently dropped the climax's music. The score check showed a −40 dB hole. Rerun the score
  check after every id change.

## Cut 3 of the campus film (2026-10-18): concept "Au", piano on a bar grid

- **Pick a tempo that divides the frame rate:** 125 BPM at 25 fps gives a 12-frame beat, a 6-frame
  8th and a 3-frame 16th. Write every timing as "bar:beat" and let build_timeline convert it, so
  cuts, letter flips, stamps and notes all share one grid.
- **Typography as plot:** a periodic-table tile (Au) that draws itself on the beats becomes a
  corner specimen tag, returns at the end, and grows t·u·m·n into Autumn. A split-flap flip
  (one letter per 16th, random glyphs for one step) turns mined → grown. Both lived in that project's
  `src/Element.tsx` (not included).
- **Specimen tags on busy textures:** a hairline-only tag vanished on fossils and strata. A
  filled paper tag (#f1ece0, dark ink) read on every shot.
- **Real calligraphy on landmarks:** generate the gate with a blank plaque, then paste the real
  plaque from the photo into a box read off a pixel grid (`paste_plaque.py`). The automatic
  blue-panel finder picked up painted beams; the manual box was exact.
- **Objects that rise above the arc** (a statue on a coal dome, a gate on a plaza): bring the
  horizon down in time (apex keys 0.70–0.72 H), starting the tilt 2–3 cuts earlier so it is
  continuous. Pin apex/a by hand; auto-detect locked onto the statue.
- **Title collisions:** landmark flashes placed on a slope (woodcut statue right, foil gate left)
  collide with a centred title. Put them in a titleless act.
- **Memory:** register_horizons on all 40+ images in one process was OOM-killed. Run it one shot
  per process (`ulimit -v 3000000`). 4 shots still hit MemoryError in auto-detection and passed
  once apex/a were pinned.
- Feedback on cut 3: give a showpiece image (the ink-wash painting) a full bar. Insert a bar
  rather than squeezing neighbours, and give it a "breath" in the music (one pedalled chord and
  a falling line, no 8th-note drive). In score3 the shift is a single `T` wrapper (`INK_BAR`).
- Echo/landmark shots whose subject sits at the bottom (blueprint canopy): raise the horizon key
  for that shot and set override `maxExtra: 1.0` (no zoom past cover). Then the whole structure
  shows.
- End card alternative to falling leaves: keyframe the horizon down to about 0.80 H over 3 bars,
  ease the title from "just above the horizon" to the frame centre, and keep its arc curve as it
  travels. The end hero needs a calm sky (extend_sky pad ~330 px).
