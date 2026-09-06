#!/usr/bin/env python3
"""
gh_release_asset.py — publish and fetch GitHub Release assets over the REST API.

WHY NOT `gh`: the self-hosted Hetzner runner has no GitHub CLI. The first NAV
archive run died on `gh release view` with exit 127. Python and curl are both
present and the REST API is stable, so the archive talks to it directly rather
than adding a tool to a box we do not administer.

WHY A RELEASE AND NOT AN ARTIFACT: actions/upload-artifact expires. The whole
point of the NAV archive is that it does not — db-backup.yml already keeps a
30-day copy, and a deletion discovered on day 31 is unrecoverable. Release assets
have no retention clock.

  python gh_release_asset.py ensure-release  --tag nav-archive
  python gh_release_asset.py download        --tag nav-archive --name manifest-latest.json --out prev.json
  python gh_release_asset.py upload          --tag nav-archive --file nav-history-2026-09-07.csv.gz
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.github.com"
UPLOADS = "https://uploads.github.com"


def _req(url: str, method: str = "GET", data: bytes | None = None,
         content_type: str | None = None, accept: str = "application/vnd.github+json"):
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        raise SystemExit("GITHUB_TOKEN / GH_TOKEN not set")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", accept)
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "startamarkets-nav-archive")
    if content_type:
        req.add_header("Content-Type", content_type)
    return urllib.request.urlopen(req, timeout=180)


def repo() -> str:
    r = os.environ.get("GITHUB_REPOSITORY")
    if not r:
        raise SystemExit("GITHUB_REPOSITORY not set")
    return r


def get_release(tag: str) -> dict | None:
    try:
        with _req(f"{API}/repos/{repo()}/releases/tags/{tag}") as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def ensure_release(tag: str, title: str, notes: str) -> dict:
    rel = get_release(tag)
    if rel:
        return rel
    body = json.dumps({"tag_name": tag, "name": title, "body": notes,
                       "make_latest": "false"}).encode()
    with _req(f"{API}/repos/{repo()}/releases", "POST", body, "application/json") as r:
        rel = json.load(r)
    print(f"[release] created {tag}", flush=True)
    return rel


def download(tag: str, name: str, out: str) -> int:
    """Missing asset is not an error: the first run has no predecessor."""
    rel = get_release(tag)
    if not rel:
        print(f"[release] {tag} does not exist yet — nothing to download", flush=True)
        return 0
    asset = next((a for a in rel.get("assets", []) if a["name"] == name), None)
    if not asset:
        print(f"[release] no asset named {name} — first run", flush=True)
        return 0
    with _req(asset["url"], accept="application/octet-stream") as r, open(out, "wb") as fh:
        fh.write(r.read())
    print(f"[release] downloaded {name} -> {out}", flush=True)
    return 0


def upload(tag: str, path: str) -> int:
    rel = get_release(tag)
    if not rel:
        raise SystemExit(f"release {tag} does not exist")
    name = os.path.basename(path)
    # Clobber: an asset name is unique per release, so replace rather than fail.
    for a in rel.get("assets", []):
        if a["name"] == name:
            _req(f"{API}/repos/{repo()}/releases/assets/{a['id']}", "DELETE").close()
            print(f"[release] replaced existing {name}", flush=True)
    with open(path, "rb") as fh:
        blob = fh.read()
    url = f"{UPLOADS}/repos/{repo()}/releases/{rel['id']}/assets?name={name}"
    with _req(url, "POST", blob, "application/octet-stream") as r:
        json.load(r)
    print(f"[release] uploaded {name} ({len(blob)/1_048_576:.1f} MiB)", flush=True)
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description="GitHub Release assets over REST")
    ap.add_argument("action", choices=["ensure-release", "download", "upload"])
    ap.add_argument("--tag", required=True)
    ap.add_argument("--name")
    ap.add_argument("--out")
    ap.add_argument("--file")
    ap.add_argument("--title", default="NAV archive")
    ap.add_argument("--notes", default="Permanent snapshots of nav_history. "
                    "Assets never expire. manifest-latest.json is the integrity "
                    "manifest the next run compares against.")
    a = ap.parse_args()
    if a.action == "ensure-release":
        ensure_release(a.tag, a.title, a.notes)
        sys.exit(0)
    if a.action == "download":
        sys.exit(download(a.tag, a.name, a.out))
    sys.exit(upload(a.tag, a.file))


if __name__ == "__main__":
    main()
