"""Compare two editions of the current question pool, question by question.

    uv run python scripts/non_essential/diff_editions.py --before 92c5df6 --label 2026-11-06   # ~40 s, no network

Run it after download_pdfs.py + build_dataset.py found a new edition. "Before" is read from git (questions and
pictures at that commit), "after" from data/. The site re-encodes every picture between editions, so pictures are
compared by perceptual hash (imagehash.phash), never by bytes.

Matching (one-to-one, most certain first):
    1. same id, same wording and options, same picture
    2. any id, same wording and options, same picture (the question moved)
    3. same wording and options, picture changed (same id first)
    4. same picture (or no picture on both sides) and similar wording and options (rapidfuzz >= FUZZY_MIN)
Whatever is left was removed or added.

Writes results/edition_diff_<label>.json: counts, the old id -> new id map, and every changed, removed or added
question with both versions.
"""

import argparse
import io
import json
import re
import subprocess
import sys
import tarfile
import time
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import imagehash
from PIL import Image
from rapidfuzz import fuzz
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import DATA, ROOT, setup_logging  # noqa: E402

log = setup_logging("diff_editions")

SAME_PICTURE = 10  # max phash distance of 64 bits, as in build_old_pool.py
FUZZY_MIN = 85


def norm(s: str) -> str:
    """Letters and digits only, lowercase, the ligature "և" written as "եւ"."""
    s = unicodedata.normalize("NFC", s).lower().replace("և", "եւ")
    return re.sub(r"[^\w]", "", s)


def content_key(q: dict) -> tuple:
    return norm(q["question"]), tuple(sorted(norm(o) for o in q["options"]))


def joined(q: dict) -> str:
    return " ".join([norm(q["question"]), *sorted(norm(o) for o in q["options"])])


def phash(data: bytes) -> imagehash.ImageHash:
    return imagehash.phash(Image.open(io.BytesIO(data)).convert("L"))


def load_before(rev: str) -> list[dict]:
    raw = subprocess.run(["git", "show", f"{rev}:data/questions.json"], cwd=ROOT, capture_output=True, check=True).stdout
    qs = json.loads(raw.decode("utf-8"))
    tar_bytes = subprocess.run(["git", "archive", rev, "data/images"], cwd=ROOT, capture_output=True, check=True).stdout
    images = {}
    with tarfile.open(fileobj=io.BytesIO(tar_bytes)) as tar:
        for m in tar.getmembers():
            if m.isfile():
                images[Path(m.name).name] = tar.extractfile(m).read()
    for q in tqdm(qs, desc="pictures before"):
        q["hash"] = phash(images[Path(q["image"]).name]) if q["image"] else None
    return qs


def load_after() -> list[dict]:
    qs = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    for q in tqdm(qs, desc="pictures after"):
        q["hash"] = phash((DATA / q["image"]).read_bytes()) if q["image"] else None
    return qs


def same_picture(a: dict, b: dict) -> bool:
    if a["hash"] is None or b["hash"] is None:
        return a["hash"] is None and b["hash"] is None
    return a["hash"] - b["hash"] <= SAME_PICTURE


def match(before: list[dict], after: list[dict]) -> dict[str, tuple[str, int]]:
    """before id -> (after id, tier)."""
    pairs: dict[str, tuple[str, int]] = {}
    taken: set[str] = set()
    after_by_id = {q["id"]: q for q in after}
    by_content: dict[tuple, list[dict]] = defaultdict(list)
    for q in after:
        by_content[content_key(q)].append(q)

    def link(b: dict, a: dict, tier: int) -> None:
        pairs[b["id"]] = (a["id"], tier)
        taken.add(a["id"])

    for b in before:  # tier 1: same id
        a = after_by_id.get(b["id"])
        if a is not None and content_key(a) == content_key(b) and same_picture(a, b):
            link(b, a, 1)

    for b in before:  # tier 2: moved
        if b["id"] in pairs:
            continue
        cands = [a for a in by_content[content_key(b)] if a["id"] not in taken and same_picture(a, b)]
        if cands:
            link(b, min(cands, key=lambda a: a["hash"] - b["hash"] if a["hash"] is not None else 0), 2)

    for b in before:  # tier 3: same words, new picture
        if b["id"] in pairs:
            continue
        cands = [a for a in by_content[content_key(b)] if a["id"] not in taken]
        if cands:
            link(b, next((a for a in cands if a["id"] == b["id"]), cands[0]), 3)

    # tier 4: reworded, best score first so a weak pair cannot take a stronger pair's partner
    open_after = [a for a in after if a["id"] not in taken]
    scored = []
    for b in before:
        if b["id"] in pairs:
            continue
        for a in open_after:
            if same_picture(a, b):
                score = fuzz.ratio(joined(a), joined(b))
                if score >= FUZZY_MIN:
                    scored.append((score, b["id"] == a["id"], b["id"], a["id"]))
    before_by_id = {q["id"]: q for q in before}
    for _, _, bid, aid in sorted(scored, reverse=True):
        if bid not in pairs and aid not in taken:
            link(before_by_id[bid], after_by_id[aid], 4)
    return pairs


def public(q: dict) -> dict:
    return {
        "id": q["id"],
        "question": q["question"],
        "options": q["options"],
        "answer_index": q["answer_index"],
        "answer": q["options"][q["answer_index"]],
        "image": q["image"],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--before", required=True, help="git commit holding the earlier edition")
    ap.add_argument("--label", required=True, help="date of the new edition, used in the output file name")
    args = ap.parse_args()
    t0 = time.time()

    before, after = load_before(args.before), load_after()
    pairs = match(before, after)
    after_by_id = {q["id"]: q for q in after}
    matched_after = {aid for aid, _ in pairs.values()}

    changed = []
    for b in before:
        if b["id"] not in pairs:
            continue
        a = after_by_id[pairs[b["id"]][0]]
        flags = []
        if norm(a["question"]) != norm(b["question"]):
            flags.append("text")
        if sorted(norm(o) for o in a["options"]) != sorted(norm(o) for o in b["options"]):
            flags.append("options")
        elif [norm(o) for o in a["options"]] != [norm(o) for o in b["options"]]:
            flags.append("order")
        if norm(a["options"][a["answer_index"]]) != norm(b["options"][b["answer_index"]]):
            flags.append("answer")
        if not same_picture(a, b):
            flags.append("picture")
        if a["id"] != b["id"]:
            flags.append("moved")
        if flags:
            changed.append({"flags": flags, "before": public(b), "after": public(a)})

    removed = [public(b) for b in before if b["id"] not in pairs]
    added = [public(a) for a in after if a["id"] not in matched_after]
    flag_counts = Counter(f for c in changed for f in c["flags"])
    report = {
        "label": args.label,
        "before_commit": args.before,
        "counts": {
            "before": len(before),
            "after": len(after),
            "matched": len(pairs),
            "identical": len(pairs) - len(changed),
            "changed": len(changed),
            "removed": len(removed),
            "added": len(added),
            "by_flag": dict(flag_counts),
            "by_match_tier": dict(Counter(tier for _, tier in pairs.values())),
        },
        "id_map": {bid: aid for bid, (aid, _) in pairs.items() if bid != aid},
        "changed": changed,
        "removed": removed,
        "added": added,
    }
    out = ROOT / "results" / f"edition_diff_{args.label}.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    log.info(f"counts: {json.dumps(report['counts'])}")
    log.info(f"wrote {out} in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
