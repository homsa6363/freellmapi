---
name: horizon-montage-generic
description: "Make a 20–25 s emotional brand film in the \"shared horizon\" match-cut style. 30–40 different worlds (cosmic, edible, handmade, microscopic, drawn, imagined) each show a curved edge registered to the same arc in frame; hard cuts accelerate from 1 s to 5 frames under a serif line that grows and bends with the horizon, resolving to a planet-limb end card with the product name and a seamless loop. Model-agnostic: it exports per-shot image prompts (id, aspect, size, prompt) and you generate the stills with any image model or tool, by hand or via a small pluggable adapter. Includes a reference analyser, horizon registration with sky extension, a Remotion template, a cut-synced procedural score and QA sheets. Use when the user wants a cinematic teaser, launch film, brand loop, sizzle or manifesto video in this style, shares a match-cut or texture-montage reference, or asks for a short emotional film from AI imagery; also to extend or re-cut such a film."
license: MIT
compatibility: Needs Node.js 18+ with npm (Remotion), Python 3 with numpy and Pillow, and ffmpeg/ffprobe. Image generation uses any model or tool you choose.
metadata:
  author: y-wi
  version: "1.0.0"
  repository: https://github.com/y-wi/horizon-montage-generic
---

# horizon-montage-generic

A 20–25 s film made of 30–40 stills. Every still shows one convex edge, registered
so that all edges coincide. A continuous virtual camera drifts across the hard
cuts. A three-beat line sits on the horizon. A synthesized score follows the cuts.
Worked example: `examples/every-word-becomes-a-world/` (a brand film for an image-generation app, "Every word / becomes / a world",
23.5 s, 34 shots; brand name replaced with a placeholder): its config, shot list, overrides, registration sheet, QA sheet and poster
are the quality bar. Look at `qa_sheet.jpg` before starting.

Read `references/style-bible.md` first: it holds the measured rules (rhythm,
geometry, type, colour, sound). Use `references/shot-prompting.md` when writing
shots, and `references/production-lessons.md` for every gotcha met so far. Add a
note there whenever you learn something new.

## Workflow

Copy the template, then work inside the copy (`<skill-dir>` is the folder that contains this `SKILL.md`):
```bash
cp -r <skill-dir>/template <project>/promo/<film-name>
cd <project>/promo/<film-name> && npm install
```

1. **Study the reference** (if the user gave one; otherwise the style bible is the reference):
   `python3 scripts/analyze_reference.py ref.mp4 out/reference`. Read the contact sheets
   and `report.txt` (shot lengths, arc apex/sagitta median, colours). Set
   `apex.yStart/yEnd/sagitta` in `data/film.config.json` from the medians.
2. **Concept, in three beats.** One thesis line split 1–2 words per beat, each beat
   larger than the last. Make the last beat *turn* if you can: the example writes
   "a word" and grows an `l` into "a world" (`morph` in the config). End card = tagline
   beat + brand lockup (mark + name). Use the product's real name and real tagline.
   Never invent claims, prices or features. Find copy in the product's own UI/i18n strings.
3. **Shot list** → `data/shotlist.json`: one entry per shot with `act`, `subject`, `sky`
   (+ optional `medium`/`light`/`finish`). The act sizes must equal the `frames` arrays
   in `film.config.json`. Order the worlds by feeling (cosmic → intimate → human → hidden →
   imagined → cosmic) and alternate sky families. Preview prompts with
   `python3 scripts/gen_shots.py --print`.
4. **Generate the stills with any image model.** `python3 scripts/gen_shots.py` writes
   `out/prompts.json` and `out/prompts.md`: per shot the id, act, aspect, size (from
   `film.config.json` width×height unless the shot list sets `size`), optional reference photo
   (`ref` + `refnote`), the full prompt, and the target file. Generate each still with whatever
   image tool you have (your own API, a local model, an agent tool, a web UI) at the film's
   aspect ratio, and save it as `public/shots_raw/<id>.png` (`.jpg`/`.webp` also work; extra
   takes as `<id>__v2.png`). To automate it, either
   - write an adapter (copy `scripts/adapters/example_adapter.py`, implement
     `generate(prompt, size, out_path, *, aspect, ref, refnote, shot)`) and run
     `python3 scripts/gen_shots.py --adapter scripts/adapters/my_adapter.py --jobs 2`, or
   - wrap any CLI: `python3 scripts/gen_shots.py --cmd 'mytool --prompt-file {prompt_file} --size {size} -o {out}'`.
   Both skip shots that already exist (safe to rerun; `--force` regenerates) and log to
   `data/gen_log.jsonl`. Keep `--jobs` within your provider's concurrency limit, and keep API
   keys in your own environment, never in the project. Everything after this step is unchanged.
5. **Register**: `python3 scripts/register_horizons.py`, then **look at
   `out/registration_sheet.jpg`**. The green line is the target arc, magenta is the
   detected one. Fix wrong detections with `data/registration_overrides.json`
   (`minY`, `apex`, `a`, `ink`, `noExtend`). Regenerate shots whose arc is ugly, that
   contain text, or whose sky is busy where the title sits.
6. **Timeline**: tune `acts[].frames` (cut lengths) and the end beats in the config, then
   `python3 scripts/build_timeline.py`. Keep the rhythm curve from the bible:
   ~1 s → ~0.55 s → ~0.4 s → ~0.3 s → 5–6 frames, then a 4 s calm resolve.
7. **Score**: `python3 scripts/score.py` (original, numpy-only, synced to
   `timeline.json`), then `python3 scripts/score_check.py`. Read `out/score_check.png`
   because you cannot listen: notes should land on the yellow cut ticks, the riser should
   climb to the red resolve line, and the mids should go silent right after it. To use a
   licensed track instead, put it in `public/audio/` and point `data/score.json` at it.
8. **Preview stills before rendering**: `npx remotion still src/index.ts HorizonFilm out/f.jpg --frame=N`
   for the opening, the first title frame, the morph, the end beats and the last frame.
9. **Render**: `npm run render` (CRF 16, 90 s delayRender timeout; ~40 s for 23 s at 1080p).
   Export a web copy: `ffmpeg -i out/horizon-film.mp4 -c:v libx264 -crf 23 -preset slow -movflags +faststart -c:a aac -b:a 192k out/horizon-film-web.mp4`. Then `python3 scripts/qa_sheet.py out/<name>.mp4` and read
   `out/qa_sheet.jpg`. Fix, re-render, and record lessons.
10. **Deliver**: the MP4 (H.264 + AAC), a poster still (the lockup frame), and a short
    note on what was generated with which model and its cost. Say that the score is
    synthesized and original.

## Files in the template

| path | role |
|---|---|
| `data/film.config.json` | size/fps, apex band + sagitta, type sizes/inks, act cut lengths, title beats, morph, end beats |
| `data/shotlist.json` | prompt template + per-shot fields |
| `scripts/analyze_reference.py` | cuts, rhythm, arc medians, palette, contact sheets for any reference video |
| `scripts/gen_shots.py` | shot list → `out/prompts.json` / `prompts.md`; optional batch generation via `--adapter` (Python `generate()`) or `--cmd` (any CLI), skip-existing + retry |
| `scripts/adapters/example_adapter.py` | documented stub of the adapter interface; copy and implement for your model |
| `scripts/register_horizons.py` | border trim → arc detection → parabola fit → upper-envelope lift → sky extension → scale/offset → ink; writes `data/registration.json` |
| `scripts/build_timeline.py` | config + shotlist → `data/timeline.json` (absolute frames for picture and sound) |
| `scripts/score.py`, `score_check.py` | cut-synced procedural score + spectrogram QA |
| `scripts/qa_sheet.py` | contact sheet of the rendered film (every shot, morph, end beats, loop seam) |
| `src/` | Remotion: `Limb` (code-drawn bookend), `Shot` (registered still + global camera), `Headline` (text on the horizon circle, morph), `EndCard`, `Grain`, `OrbMark` |

## Adapting

- **Other aspect ratios**: change `width/height` (e.g. 1080×1920). Generate shots at the
  same aspect, and expect a lower sagitta to look right on vertical.
- **Another product mark**: replace `src/OrbMark.tsx` with the brand's mark (monochrome,
  ~0.8 × cap height). Do not invent a logo for a real company. If the brand has none,
  set the name alone.
- **Longer film**: add acts and keep the halving rhythm. More than ~45 shots dilutes the
  effect, so lengthen the calm bookends instead.
- **Different shared shape** (a vertical seam, a circle, a diagonal): the registration
  and the headline circle are arc-specific. Swap the parabola fit for the new primitive
  and keep everything else.
