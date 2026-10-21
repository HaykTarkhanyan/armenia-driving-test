"""Download the previous question pool (before the 2026 A/B/C vs D/T split) from the Wayback Machine.

Until autumn 2026 https://www.roadpolice.am/hy/viv-exam linked one PDF per group and language as
/exam/<lang>_group_<N>.pdf (one pool for all categories). The site no longer serves them (404), but
the Wayback Machine captured the page on 2026-06-08 and the PDFs around then. This script reads the
link list from that capture, downloads each PDF from the capture nearest to SNAPSHOT into
official/old_pool/<lang>_group_<N>.pdf and writes official/old_pool/manifest.json (capture URL and
time, size, SHA-256, PDF creation date).

    uv run python scripts/download_old_pool.py   # ~5-15 min for 20 files (waits 15 s between files; resumable, skips files already downloaded)

Why we keep it: by point 16 of Decision 385-Ն new questions may be used only 30 days after
publication, so exams before about 2026-11-01 may still draw from this pool (DECISIONS.md #5).
"""

import hashlib
import json
import re
import time
import urllib.request
from datetime import datetime, timezone

import pymupdf
import truststore

from common import GROUPS, OFFICIAL, setup_logging

truststore.inject_into_ssl()
log = setup_logging("download_old_pool")

SNAPSHOT = "20260608"
PAGE = f"https://web.archive.org/web/{SNAPSHOT}id_/https://roadpolice.am/hy/viv-exam"
LANGS = ["hy", "en"]
OUT = OFFICIAL / "old_pool"
CAPTURE_RE = re.compile(r"/web/(\d{14})id_/")


def fetch(url: str, tries: int = 5) -> tuple[bytes, str]:
    """Return (body, final URL). The Wayback Machine answers 503/429, or refuses connections for a
    while, when asked too fast, so those are retried with growing waits; anything else raises."""
    for attempt in range(1, tries + 1):
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                return r.read(), r.geturl()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or attempt == tries:
                raise
            reason = f"HTTP {e.code}"
        except urllib.error.URLError as e:
            if attempt == tries:
                raise
            reason = str(e.reason)
        log.warning(f"{url}: {reason}, retry {attempt}/{tries - 1} in {30 * attempt}s")
        time.sleep(30 * attempt)
    raise AssertionError("unreachable")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    html = fetch(PAGE)[0].decode("utf-8", "replace")
    linked = set(re.findall(r"/exam/([a-z]+)_group_(\d+)\.pdf", html))
    wanted = [(lang, g) for lang in LANGS for g in GROUPS]
    missing = [w for w in wanted if (w[0], str(w[1])) not in linked]
    if missing:
        raise RuntimeError(f"the {SNAPSHOT} capture links no PDF for {missing}")

    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    t0 = time.time()
    for i, (lang, g) in enumerate(wanted, 1):
        name = f"{lang}_group_{g}.pdf"
        path = OUT / name
        if (name in manifest and path.exists()
                and hashlib.sha256(path.read_bytes()).hexdigest() == manifest[name]["sha256"]):
            log.info(f"{i}/{len(wanted)} {name}: already downloaded, skipped")
            continue
        body, final = fetch(f"https://web.archive.org/web/{SNAPSHOT}id_/https://roadpolice.am/exam/{name}")
        if not body.startswith(b"%PDF"):
            raise RuntimeError(f"{name}: not a PDF (first bytes {body[:20]!r}) from {final}")
        path.write_bytes(body)
        meta = pymupdf.open(stream=body, filetype="pdf").metadata
        capture = CAPTURE_RE.search(final)
        if not capture:
            raise RuntimeError(f"{name}: cannot read the capture time from {final}")
        manifest[name] = {
            "wayback_url": final,
            "captured_utc": datetime.strptime(capture.group(1), "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
            .isoformat(timespec="seconds"),
            "bytes": len(body),
            "sha256": hashlib.sha256(body).hexdigest(),
            "pdf_created": meta.get("creationDate", ""),
            "pdf_creator": meta.get("creator", ""),
        }
        manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
        elapsed = time.time() - t0
        log.info(f"{i}/{len(wanted)} {name}: {len(body) / 1e6:.1f} MB, captured {capture.group(1)}, "
                 f"created {meta.get('creationDate', '?')}, {elapsed:.0f}s elapsed, "
                 f"~{elapsed / i * (len(wanted) - i):.0f}s left")
        time.sleep(15)  # the Wayback Machine refuses connections for minutes after bursts
    log.info(f"done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
