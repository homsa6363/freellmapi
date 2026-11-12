#!/usr/bin/env python3
"""Search the Openverse API (stdlib only)."""
import argparse, json, os, sys, urllib.error, urllib.parse, urllib.request

BASE = os.environ.get("OPENVERSE_API", "https://api.openverse.org/v1")
UA = "openverse-skill/1.0"


def call(url, data=None, token=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:500]
        sys.exit(f"HTTP {e.code} from {url}: {body}")
    except urllib.error.URLError as e:
        sys.exit(f"Network error for {url}: {e.reason}")


def get_token():
    cid, secret = os.environ.get("OPENVERSE_CLIENT_ID"), os.environ.get("OPENVERSE_CLIENT_SECRET")
    if not (cid and secret):
        return None
    form = urllib.parse.urlencode(
        {"grant_type": "client_credentials", "client_id": cid, "client_secret": secret}
    ).encode()
    return call(f"{BASE}/auth_tokens/token/", data=form)["access_token"]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("media", choices=["images", "audio"])
    p.add_argument("query")
    p.add_argument("-n", "--page-size", type=int, default=10)
    p.add_argument("--page", type=int, default=1)
    for f in ["license", "license-type", "source", "category", "extension",
              "aspect-ratio", "size", "length", "creator"]:
        p.add_argument(f"--{f}")
    p.add_argument("--json", action="store_true", help="print raw API JSON")
    a = p.parse_args()

    params = {"q": a.query, "page_size": a.page_size, "page": a.page}
    for f in ["license", "license_type", "source", "category", "extension",
              "aspect_ratio", "size", "length", "creator"]:
        v = getattr(a, f)
        if v:
            params[f] = v
    res = call(f"{BASE}/{a.media}/?{urllib.parse.urlencode(params)}", token=get_token())

    if a.json:
        print(json.dumps(res, indent=2))
        return
    print(f"{res.get('result_count', '?')} total results, showing {len(res.get('results', []))}\n")
    for r in res.get("results", []):
        lic = f"{r.get('license', '')} {r.get('license_version') or ''}".strip().upper()
        print(f"- {r.get('title') or '(untitled)'}  [{lic}]")
        print(f"  creator: {r.get('creator') or 'unknown'} | source: {r.get('source')}")
        print(f"  file: {r.get('url')}")
        print(f"  page: {r.get('foreign_landing_url')}")
        print(f"  attribution: {r.get('attribution')}\n")


if __name__ == "__main__":
    main()
