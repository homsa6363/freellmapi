# scene.json — format read by make_jsx.js / aelib.jsx

Contents: [Top level](#top-level) · [Comps](#comps) · [Layers](#layers) · [Animated values & easing](#animated-values--easing) · [Layer types](#layer-types) · [Masks](#masks) · [Effects](#effects) · [Gotchas](#gotchas)

## Top level

```json
{
  "project": { "output": "My Film.aep", "stills": [3.5, 12.0], "stillsDir": "check", "bitsPerChannel": 16 },
  "assets":  [ { "id": "photo1", "path": "assets/photo1.png", "name": "Photo 1.png" } ],
  "comps":   [ { ...precomp... }, { ...precomp... }, { ...main comp, "main": true } ]
}
```

- Relative paths resolve against the folder holding scene.json.
- `stills`: times (seconds) the builder renders from the main comp to `stillsDir` as `ae_t<time>.png`, for checking against the original.
- `comps` order matters: a comp must be listed **before** any comp that uses it as a precomp.

## Comps

```json
{ "id": "main", "name": "Film — MAIN", "main": true, "width": 3840, "height": 1646, "duration": 44, "fps": 30,
  "bg": "#0c0805", "motionBlur": { "shutter": 180 },
  "markers": [ { "t": 0.5, "dur": 4.4, "text": "Narration line 1" } ],
  "layers": [ ...bottom first, top last... ] }
```

Layers are listed **bottom → top** (the last one is the top of the timeline).

## Layers

Common fields (all optional except `type`):

| field | meaning |
|---|---|
| `id` | reference for `parent` / `matte` (unique within the comp) |
| `name` | layer name shown in AE: make it say what the layer is |
| `parent` | id of a layer in the same comp (set before transforms, so transforms are in parent space) |
| `transform` | `{ anchor, position, scale, rotation, opacity }`; each a value or an animated value. Scale is `[x%, y%]`, rotation in degrees |
| `expr` | `{ "ADBE Position": "expression code", "ADBE Rotate Z": "...", "ADBE Scale": "...", "ADBE Opacity": "...", "ADBE Anchor Point": "..." }` |
| `effects`, `masks` | see below |
| `blend` | `add`, `screen`, `multiply`, `overlay`, `soft-light`, `darken`, `lighten` |
| `motionBlur`, `collapse` (continuously rasterize / collapse transformations), `preserveTransparency`, `shy`, `guide`, `locked` | booleans |
| `enabled: false` | hide the layer (e.g. a track-matte source) |
| `matte` | `{ "layer": "<id>", "type": "alpha" \| "alpha-inverted" \| "luma" }` |
| `label` | AE label colour index 0–16 |
| `inPoint`, `outPoint` | seconds |
| `comment` | shows in the layer's Comment column: use it to tell the editor how the layer works |

Shape and null layers start with anchor and position at `[0,0]`, so their coordinates are the parent's coordinates. Solids, images and precomps keep AE's default (anchor = their centre).

## Animated values & easing

```json
{ "k": [ [time, value, ease], ... ], "ease": "default ease for all keys", "expr": "optional expression on top" }
```

`ease` per key:

| ease | result |
|---|---|
| `"linear"` / `"hold"` | linear / hold interpolation |
| `"ease"` (default) | easy ease, 40% influence both sides |
| a number `n` | easy ease with influence n% |
| `{ "i": [speed, influence], "o": [speed, influence] }` | exact bezier ease. Speed is in property units per second (px/s, %/s, deg/s). For spatial props (position, anchor) speed is the magnitude along the path. For multi-dimensional non-spatial props (scale) pass speed as an array `[sx, sy]` |

**Matching a code-made curve exactly.** A cubic Hermite segment with end velocities v0, v1 is the same curve as an AE bezier key pair with speeds v0, v1 and **influence 33.333%**. So sample your curve at its rest points, take the derivative there, and pass `{ "i": [v, 33.333], "o": [v, 33.333] }`. Where the curve isn't a single cubic (e.g. a zoom that dips mid-move, or log-space zoom), add extra keys at ¼, ½, ¾ of the move, each with its own derivative.

Spatial keys get straight spatial paths (no auto-bezier wander).

## Layer types

| type | extra fields |
|---|---|
| `solid` | `color`, `width`, `height` (default comp size) |
| `adjustment` | comp-size adjustment layer: put the effects on it |
| `null` | — |
| `text` | `text` (use `\r` for line breaks), `font` (**PostScript name**, e.g. `Didot`, `BradleyHandITCTT-Bold`), `size`, `color`, `justify` (`left`/`center`/`right`), `tracking` (1/1000 em; a number, or an animated value, which adds a "Tracking" text animator), `leading`, `reveal` |
| `shape` | `groups`: see below |
| `image` / `footage` | `asset`, optional `width`/`height` in comp pixels (scale is computed) |
| `audio` | `asset`, `level` (dB) |
| `precomp` | `comp` (id) |

Position of a text layer = the baseline start of its first line (`left`) or the baseline centre (`center`), the same as canvas `fillText`.

**`reveal`** (handwriting / typing that lands on spoken words): `{ "times": [t_word1, t_word2, ...], "dur": 0.28, "feather": 8 }`. The builder measures each word inside AE and keys a rectangular **Write-on** mask (one key pair per word) so each word appears at its time. The text stays live and editable.

**Shape groups**

```json
{ "name": "Coast", "paths": [ ...path objects... ],
  "fill": { "color": "#d4bd8e", "opacity": 100 },
  "stroke": { "color": [90,63,36], "width": 6, "opacity": 100, "cap": "round", "join": "round", "dash": [18, 14] },
  "trim": { "start": 0, "end": { "k": [[3.0, 0], [3.65, 100]] } },
  "transform": { "anchor": [0,0], "position": [0,0], "scale": [100,100], "rotation": 0, "opacity": 100 } }
```

Path objects: `{ "type": "path", "points": [[x,y],...], "closed": true, "inTangents": [...], "outTangents": [...] }` (tangents are relative to their vertex) · `{ "type": "rect", "x", "y", "w", "h", "r" }` · `{ "type": "ellipse", "cx", "cy", "rx", "ry" }`. Add `"asPath": true` to a rect or ellipse to make it a bezier path (needed for trim-path draw-ons to start where you expect).

Colours: `"#rrggbb"`, `[r,g,b]` 0–255, or `[r,g,b]` 0–1.

## Masks

```json
{ "name": "Soft circle", "shape": { "type": "ellipse", "cx": 300, "cy": 300, "rx": 150, "ry": 150 },
  "mode": "add", "inverted": false, "feather": 200, "opacity": 100, "expansion": 0 }
```

Mask coordinates are in the layer's own pixels (a solid's top-left is 0,0). `shape` can be animated (`{k: [[t, shapeObj], ...]}`). `feather` is a number or `[x, y]`.

## Effects

```json
{ "match": "ADBE Gaussian Blur 2", "name": "Softness", "props": { "Blurriness": 40, "Repeat Edge Pixels": 0 } }
```

Props go by their display name (English AE). Checked match names and value ranges:

| effect | match name | notes |
|---|---|---|
| Gaussian Blur | `ADBE Gaussian Blur 2` | `Blurriness` |
| Drop Shadow | `ADBE Drop Shadow` | `Opacity` is **0–255**, `Distance`, `Softness`, `Direction` |
| Fill | `ADBE Fill` | `Opacity` is **0–1** |
| Glow | `ADBE Glo2` | `Glow Threshold` is **0–255**, `Glow Radius`, `Glow Intensity` |
| Noise (grain) | `ADBE Noise` | `Amount of Noise` 0–100, `Noise Type` 0 = mono |
| Linear Wipe | `ADBE Linear Wipe` | `Transition Completion` 0–100, `Wipe Angle`, `Feather` |
| Gradient Ramp | `ADBE Ramp` | `Start of Ramp`, `Start Color`, `End of Ramp`, `End Color` |
| Slider Control | `ADBE Slider Control` | `Slider` (rename the effect to label it, then read it in expressions) |

`ADBE Add Grain` is not available to scripts: use Noise for grain.

## Gotchas

- **Effects on shape and text layers are applied after the layer's transform**, so a blur on a shape layer doesn't scale with the camera. For shadows and glows that should live in the world, use a **solid with a mask** (its effects work in its own pixels and scale with the camera).
- **Precomps blur when zoomed.** Turn on `collapse` for precomps that hold vectors and text, so they stay sharp at any camera zoom. Author object precomps at 2× and scale the layer to 50%, so raster content inside is sharp too.
- A **solid's mask feather can't reach past the solid's edge.** Make glow solids about 2× (radius + feather).
- `preserveTransparency` on a black solid placed on top inside a precomp gives a clean "dim this object" control.
- Imported footage is forced to **square pixels**: AE otherwise guesses non-square for sizes like 720×480 or 960×720 and stretches the image.
- A Linear Wipe on a text layer spans the whole comp, not the text: don't key its completion against word widths (the builder's `reveal` uses a mask instead).
- A track-matte source can stay hidden (`enabled: false`) in AE 2023 and later.
- ExtendScript is ES3. If you hand-edit aelib.jsx: no `let`/`const`, arrow functions, `forEach` or `JSON`.
