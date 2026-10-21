"""Download the official theory-exam question PDFs from roadpolice.am.

Reads the link list on https://www.roadpolice.am/hy/viv-exam and downloads the A/B/C category PDFs
(10 groups) for the given languages into official/ as abc_<lang>_<group>.pdf, then writes
official/manifest.json (URL, version date, size, SHA-256 per file). The PDFs are not in git
(0.1-18 MB each, 84 MB per language); the manifest is, so a later download can be compared against it.

A file is downloaded again only when the site's version stamp (?v=<unix time>) changed or the file
is missing.

    uv run python scripts/download_pdfs.py            # hy + en, ~2 min for 20 files (measured 105 s)
    uv run python scripts/download_pdfs.py --lang hy  # Armenian only

roadpolice.am does not send its intermediate certificate, so plain Python (and Git Bash curl) fail
with "unable to get local issuer certificate". truststore verifies through Windows, which fetches
the missing intermediate itself; verification stays on.
"""

import argparse
import hashlib
import json
import re
import time
import urllib.request
from datetime import datetime, timezone

import truststore

from common import GROUPS, OFFICIAL, setup_logging

truststore.inject_into_ssl()
log = setup_logging("download_pdfs")

INDEX_URL = "https://www.roadpolice.am/hy/viv-exam"
LINK_RE = re.compile(r"https://www\.roadpolice\.am/exam/abc/(\w+)/(\d+)\.pdf\?v=(\d+)")


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=120) as r:
        if r.status != 200:
            raise RuntimeError(f"{url}: HTTP {r.status}")
        return r.read()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", nargs="+", default=["hy", "en"], help="language codes on the site (hy, ru, en, ar, pe)")
    args = ap.parse_args()

    OFFICIAL.mkdir(exist_ok=True)
    manifest_path = OFFICIAL / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}

    html = fetch(INDEX_URL).decode("utf-8")
    links = {(lang, int(g)): (m.group(0), int(v)) for m in LINK_RE.finditer(html) for lang, g, v in [m.groups()]}
    wanted = [(lang, g) for lang in args.lang for g in GROUPS]
    missing = [k for k in wanted if k not in links]
    if missing:
        raise RuntimeError(f"index page has no link for {missing} - the page layout may have changed")

    t0 = time.time()
    for i, (lang, g) in enumerate(wanted, 1):
        url, version = links[(lang, g)]
        name = f"abc_{lang}_{g}.pdf"
        path = OFFICIAL / name
        if path.exists() and manifest.get(name, {}).get("version") == version:
            log.info(f"{i}/{len(wanted)} {name}: unchanged (v={version}), skipped")
            continue
        body = fetch(url)
        if not body.startswith(b"%PDF"):
            raise RuntimeError(f"{url} did not return a PDF (first bytes {body[:20]!r})")
        path.write_bytes(body)
        manifest[name] = {
            "url": url,
            "version": version,
            "version_utc": datetime.fromtimestamp(version, timezone.utc).isoformat(timespec="seconds"),
            "bytes": len(body),
            "sha256": hashlib.sha256(body).hexdigest(),
            "downloaded_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
        elapsed = time.time() - t0
        log.info(f"{i}/{len(wanted)} {name}: {len(body) / 1e6:.1f} MB, {elapsed:.0f}s elapsed, "
                 f"~{elapsed / i * (len(wanted) - i):.0f}s left")
    log.info(f"done in {time.time() - t0:.0f}s, manifest: {manifest_path}")


if __name__ == "__main__":
    main()
