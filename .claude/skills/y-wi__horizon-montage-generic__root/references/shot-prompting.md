# Shot prompting — generating registration-friendly worlds

The montage needs 30–40 stills that all show **one convex edge across the frame
with empty space above**. Image models do this reliably if the prompt fixes the
composition explicitly and lets only the material vary.

## Template (fill per shot; lives in `data/shotlist.json`)

```
{medium} {subject} Composition: seen edge-on, so the subject's rounded top edge forms
ONE smooth convex arc across the entire frame, like the horizon of a small planet. The
highest point of the arc is centered left-to-right and sits exactly at the vertical
middle of the image; the arc falls gently and symmetrically to about three-quarters of
the image height at the far left and right edges. Above the arc: {sky}, completely
empty, calm negative space with nothing in it. Below the arc: the subject fills the
frame edge to edge with rich, tactile detail. Lighting: {light}. {finish} Constraints:
no text, no letters, no logos, no watermark, no people, no frame or border, nothing
rising above the arc.
```

Defaults: `medium = "Real macro photograph, taken on a real camera with a macro lens."`,
`finish = "Shallow depth of field with focus on the rim of the arc, subtle natural film grain, true-to-life colour."`

Per shot you only write `subject`, `sky`, sometimes `medium`/`light`/`finish`:
- `medium` switches the image family: "Astronomical telescope photograph.",
  "High-resolution scan of a 19th-century hand-coloured engraving.",
  "Brightfield microscope image.", "Thermal camera image in a false-colour palette.",
  "Photograph of a cut-paper collage artwork.", "Scan of a child's crayon drawing."
- `sky` is the most important field for rhythm: alternate `pure black`, a flat
  saturated backdrop (`a flat saturated turquoise backdrop`), paper (`warm cream paper`,
  `aged tan paper`), and real skies (`deep indigo night sky with fine stars`).

## Measured behaviour (one current text-to-image model, 16:9, ~2K)

Measured on the first film. Other models differ in the numbers but usually share the
tendencies, so check the registration sheet after the first few shots and adjust.


- The apex lands at **31–52% of the height** (median ≈ 0.40), above the "vertical
  middle" you ask for. Registration handles it: calm skies are extended upward
  instead of zooming. A busy sky forces a zoom of up to 1.6–1.8×, which goes soft.
  So prefer calm skies for shots where the apex might come out high.
- Curvature comes out fairly consistent (sagitta 0.10–0.20 of the height).
- About 1 in 4 frames carries 3–5 px black letterbox lines on the top or bottom
  edge. `register_horizons.py` trims them, so never skip the trim.
- Subjects with a figure (an animal, a building) put that figure above the arc.
  That is fine for pre-title shots; set an override `minY` so detection finds the ground
  line instead of the figure.
- Thin line art (pencil, chalk, geometric diagrams) detects with lower confidence.
  Check the overlay sheet, and add `apex`/`a` overrides if the fit is off.

## Subject library (pick across rows, never two neighbours from the same row)

| family | worlds that work |
|---|---|
| cosmic | planet limb at dawn, solar photosphere with sunspots, Earth night side with city lights, a moon's terminator, Saturn ring edge |
| edible | honey dome with bubbles, sourdough crust, chocolate fluting, tomato skin with droplets, citrus peel pores, pomegranate arils on a petal rim, bread flour dusting |
| natural macro | leaf edge with veins, moss and lichen with tiny mushrooms, pollen-covered dome, feather down, mushroom gills, butterfly wing scales, frost on glass, coral reef, sand dune crest |
| made by hand | Greek meander pottery rim, lace scallop, William-Morris fabric, embroidery, cracked plaster dome, ceramic glaze, woven basket, stained glass |
| drawn / printed | chalk construction lines, woodcut celestial globe, hand-coloured engraving, pencil grasses on a circle, crayon arcs, cut-paper collage, geometric ruled diagram, blueprint |
| scientific | plant-stem microscope section, agate slice, thermal image, X-ray of a shell, electron micrograph of pollen |
| imagined (end of montage) | a planet lined with glass greenhouses, an origami planet, a city on a tiny world, a cloud continent, a paper-mountain range |

Order by **feeling**: start cosmic and slow, go tactile/edible (intimate), then
handmade/drawn (human), then scientific (hidden), then imagined (possibility),
and end on something cosmic that hands off to the closing bookend.

## Budget & generation

- `python3 scripts/gen_shots.py` writes every prompt to `out/prompts.json` / `out/prompts.md`
  with the target file name. Generate with any model at the film's aspect ratio (≈2K on the
  long side is plenty; registration rescales), and save to `public/shots_raw/<id>.png`.
- Automate with `--adapter` (implement `generate()` in a copy of
  `scripts/adapters/example_adapter.py`) or `--cmd` (wrap any CLI). Both skip existing shots.
- Budget about **1.2 × the shot count** in generations: some shots need a second take.
  Measure cost from your balance before and after the whole batch, not from the first job.
- Many providers cap concurrent jobs per account. Keep `--jobs` at or below that cap; a
  "busy / already running" rejection is a reason to wait and resubmit, not a failure of
  the prompt. Test one shot before launching a whole batch after any provider error.
- Expect roughly a minute per image on hosted models. Run the batch in the background and
  work on code and sound meanwhile.
- Regenerate a single shot with `gen_shots.py s17_wallpaper --force` after editing its
  prompt (or just overwrite the file by hand).
- Reference photos: add `"ref": "../photos/x.jpg", "refnote": "keep the clock tower"` to a
  shot. They appear in the prompt manifest and are passed to your adapter; use them only
  if your model accepts image inputs.
