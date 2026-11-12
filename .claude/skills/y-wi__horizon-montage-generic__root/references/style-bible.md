# Style bible — the shared-horizon montage

Extracted frame by frame from the reference film (20 s, 25 fps, 4K, 38 shots; a
"There's / more to / discover" product film). Numbers below were measured with
`scripts/analyze_reference.py`, not eyeballed. Use them as defaults and change one
thing at a time.

## 1. The one idea

Every shot is a **different world seen at its edge**: a convex arc (planet limb,
bread crust, a leaf, lace, plant cells, a woodcut globe, feather down, mushroom gills)
crossing the full frame at the **same height and curvature**. The material changes
violently from shot to shot; the shape never moves. The hard cut becomes a match cut,
and thirty-eight unrelated textures read as one continuous camera move across
"everything there is". The emotion comes from scale: cosmic → edible → handmade →
microscopic → drawn → cosmic again.

Rules that make it work:
- The arc is the only constant. Never reuse a palette twice in a row; alternate
  dark skies and loud flat colour skies (turquoise, magenta, cream, sky blue).
- The area above the arc is always **empty** (black, flat backdrop, paper, sky).
  It is where the title sits.
- Materials span categories: astronomy, food macro, museum objects, textiles,
  scientific imaging (microscope, thermal), drawings/prints/scans, children's art,
  landscapes, then a few imagined worlds. Mixing photo and illustration is part of it.

## 2. Structure and rhythm (cut lengths in seconds)

| phase | time | shot length | what happens |
|---|---|---|---|
| bookend open | 0–1.2 | 1.24 | planet limb at dawn: navy sky, blue airglow, thin orange band, near-black planet |
| wonder | 1.2–3.3 | ~1.0 | 2–3 slow macro worlds, no text |
| stutter | 3.3–4.2 | 0.44, 0.24, 0.24 | a quick triple: first hint of acceleration |
| gather | 4.2–8.7 | ~0.55 | steady pulse, 8 shots, still no text |
| line 1 | 8.7–10.3 | ~0.36 | first word appears ("There's") and stays put while worlds cut under it |
| line 2 | 10.3–12.4 | ~0.36 | second beat ("more to") |
| line 3 | 12.4–15.9 | 0.28 → 0.20 | third beat ("discover"), fastest cutting, type grows |
| resolve | 15.9–17.5 | hold | hard cut to a calm night limb; product name |
| lockup | 17.5–19.0 | hold | brand mark + name |
| bookend close | 19.0–20.0 | tilt | camera tilts down, dawn band rises back to the opening frame (seamless loop) |

Shot length roughly halves twice (1.0 → 0.55 → 0.3) and ends at 5-frame cuts, then
the film stops dead for ~4 s. That contrast (acceleration, then stillness) is the
emotional payoff. Text arrives only after ~40% of the runtime.

## 3. Geometry

- Arc apex: centred, median **47% of frame height** (range 0.42–0.52).
- Sagitta (drop from apex to the frame edge): median **0.14 × frame height**.
  In output pixels the arc is a circle of radius `R = (W/2)^2 / (2 · sag · H)`
  (≈ 2,900 px at 1080p).
- Inside each shot the camera barely moves: slow push-in, the horizon creeping
  upward a few pixels, organic micro-motion. Across the edit the horizon slowly
  rises and the lens pushes in. That continuous move is what makes the cuts feel
  like one shot.

## 4. Typography

- A text serif with soft contrast (reference ≈ Tiempos/Copernicus; free stand-ins:
  **Newsreader**, Source Serif, Literata). Regular weight (~450), sentence case,
  tight tracking (−0.5%).
- One short phrase split into 3 beats (1–2 words each). Each beat replaces the last
  in place, always on a cut, never with a fade.
- The baseline sits ~2–3% of frame height above the apex, **set on a circle
  concentric with the horizon**, so the word bends very slightly with every world.
- Size grows through the film (≈ 76 px → 140 px at 1080p): the type is part of
  the push-in.
- Ink flips per shot: light ink (#f4f1ea) on dark skies, near-black (#151412) on
  pale skies, decided by the luminance behind the word. A faint halo (drop shadow
  18 px, 22–38% alpha) keeps it readable over busy material.
- First appearance gets a short focus pull (blur 10 px → 0 over ~7 frames). After
  that, only hard switches.
- Film grain sits **over** the type, so the type looks photographed rather than laid on top.

## 5. Colour and texture

- Bookends: navy sky `#0f1217`/`#132029`, airglow blues `#304f63 → #6c8991`,
  pale `#9b8681`, dawn `#d58f49 → #ce4727`, planet `#3f1b1b → #161616`.
- Montage: true-to-life material colour, no unifying grade. Saturated flat
  backdrops (teal `#1fb5c9`, magenta `#9b3d8f`, sky blue `#9ec0ef`, cream
  `#efe6d6`) break up runs of black skies.
- Visible luminance grain (~16% overlay), soft vignette, lens softness. Nothing
  looks digital-clean.

## 6. Sound (the reference file shipped silent; this is what the cut asks for)

- The music follows the cuts, not a fixed tempo: one soft note per cut, so the
  accelerating edit becomes an accelerating arpeggio.
- A pad changes chord at each act. A sub pulse and a tick come in once the text
  arrives. A filtered-noise riser climbs to the resolve.
- **Hard drop at the resolve**: mids and highs go silent, only a low bloom remains,
  then a warm chord swells under the product name. One piano note and a bell land
  on the lockup, and a high shimmer rises with the dawn tilt.

## 7. What not to do

- No crossfades between worlds. No whip pans, glitches, zoom-blurs or other
  transition effects.
- No text in the first ~40% of the film. Never more than 2 words on screen in the montage.
- No UI screenshots, logos or product chrome inside the montage. The product shows
  up only in the resolve.
- Never let anything rise above the arc into the title zone (the one exception is
  a pre-text shot such as the leaping horse).
