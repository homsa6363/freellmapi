---
name: openverse
description: Search Openverse (WordPress's catalog of openly licensed images and audio) via its public API and return results with ready-to-use attribution. Use when the user wants free/CC-licensed/public-domain images, photos, illustrations, music or sound effects, asks for license-safe media for a project, or needs a proper credit line for a Creative Commons work.
---

# Openverse

Openverse (https://openverse.org, source: https://github.com/WordPress/openverse) indexes
openly licensed media. API base: `https://api.openverse.org/v1/`. Media types: `images`, `audio`.

## Quick use

```bash
python3 .claude/skills/openverse/scripts/openverse_search.py images "red fox" --license-type commercial --category photograph -n 5
python3 .claude/skills/openverse/scripts/openverse_search.py audio "rain" --category sound_effect --length short
```

Prints title, creator, license, source, direct file URL, landing page and a ready attribution
string. Add `--json` for the raw API response.

## Auth and limits

- Anonymous works but is throttled hard (source defaults: 5/hour burst, 100/day sustained).
- For real use, register an app once and set `OPENVERSE_CLIENT_ID` / `OPENVERSE_CLIENT_SECRET`;
  the script fetches a bearer token itself (registered: ~100/min, 10000/day).
  - `POST /v1/auth_tokens/register/` JSON `name`, `description`, `email` -> `client_id`, `client_secret`
  - `POST /v1/auth_tokens/token/` form `grant_type=client_credentials`, `client_id`, `client_secret`
  - Registering needs the user's email: ask for it, never invent one.
- On HTTP 429 stop and tell the user; don't retry in a loop.
- Some sandboxes block api.openverse.org; the script then reports the network error.

## Search parameters (from `api/api/serializers/*` in the repo)

Common: `q` (<=200 chars), `page`, `page_size`, `source`, `excluded_source`, `creator`, `title`,
`tags` (`tags`/`title` can't combine with `q`), `license` (comma list), `license_type`
(`all`, `all-cc`, `commercial`, `modification`), `extension`, `mature`, `filter_dead`.

- Images: `category` = digitized_artwork | illustration | photograph;
  `aspect_ratio` = tall | wide | square; `size` = small | medium | large.
- Audio: `category` = audiobook | music | news | podcast | pronunciation | sound_effect;
  `length` = shortest | short | medium | long.
- Detail: `GET /v1/{images|audio}/{id}/`. Related: `/v1/{type}/{id}/related/`.

## Rules when handing results to the user

1. Choose the license filter from the use case: commercial -> `--license-type commercial`;
   editing/remixing -> `--license-type modification`. Say which you used.
2. Always give the attribution line and link the landing page. `cc0`/`pdm` need no
   attribution but still cite the source.
3. Mature content is excluded by default; don't enable it unless asked.
4. Openverse indexes third-party sites and license metadata can be wrong: tell the user to
   verify on the landing page before commercial publication.
