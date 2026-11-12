# QA checklist

Run it on stills before the full render, and on `out/qa_sheet.jpg` after it.

## Shots (`out/registration_sheet.jpg`)
- [ ] Magenta (detected) follows the visible edge and roughly matches green (target) in every tile.
- [ ] Every tile marked `low` was checked by eye. Fix with `minY`, or with `apex` + `a` (read
      off the raw image with pixel ticks), or regenerate.
- [ ] No text, letters, logos, watermarks, people or frames in any shot.
- [ ] Nothing rises above the arc into the title box in the titled acts (figures are fine before the first title).
- [ ] Neighbouring shots differ in family and sky: no two black skies of the same
      colour family in a row inside fast acts, and a flat colour backdrop every 3–5 shots.
- [ ] Total scale ≤ ~1.6× cover. Above that the shot goes soft, so regenerate it or extend the sky.

## Picture (stills / qa sheet)
- [ ] Opening frame = last frame (loop seam): same limb height and dawn colour.
- [ ] The first title focus-pulls in. Later beats switch exactly on a cut.
- [ ] Title readable on every shot: right ink, halo visible over busy material,
      never crossing a bright highlight at low contrast.
- [ ] The morph (if any) lands inside one or two shots and reads as a reveal, not a glitch.
- [ ] End beats: tagline and lockup centred, mark aligned to cap height, lockup leaves
      with the tilt and is gone before the frame top.
- [ ] Grain visible but not dominant (~0.12–0.18 overlay). Vignette subtle.

## Rhythm
- [ ] Cut lengths follow the curve: slow (~1 s) → ~0.55 s → ~0.4 s → ~0.3 s → 5–6 frames.
- [ ] The resolve holds ≥ 4 s of calm after the fastest cut.
- [ ] No single shot under 5 frames (at 25 fps). Shorter reads as flicker, not cuts.

## Sound (`out/score_check.png`)
- [ ] A note onset on every yellow cut tick during the montage.
- [ ] Pulses and ticks start at the first title (green line).
- [ ] The riser peaks right at the red resolve line, then the mids go silent within ~60 ms.
- [ ] The end chord swells back ≥ 0.3 s later. The lockup chime is visible at the lockup frame.
- [ ] Peak −1 dBFS and RMS around −14 to −18 dBFS. Fades at both file ends (for looping).

## Delivery
- [ ] `ffprobe` shows H.264 + AAC, the expected duration, 25 fps, 1920×1080 (or the chosen size).
- [ ] Poster still exported from the lockup frame.
- [ ] Note to the user: models used, image count and cost, which parts are generated,
      that the score is original synthesis, and any shots that are weaker.
