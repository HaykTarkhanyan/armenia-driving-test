"""Register a new edition of the question pool in data/edition.json, so saved progress keeps working.

    uv run python scripts/non_essential/diff_editions.py --before <last commit with the old data> --label 2026-12-01   # ~20 s
    uv run python scripts/non_essential/new_edition.py --label 2026-12-01                                              # ~1 s
    uv run python scripts/non_essential/new_edition.py --init 2026-11-06                                               # first setup only

The police site regenerates its PDFs often, usually with identical questions. If the fingerprint of the questions did
not change, this script says so and changes nothing. Otherwise it adds a migration (old id -> new id, removed questions,
reordered options, changed options) built from results/edition_diff_<label>.json. A test in the app fails the deploy
while data/questions.json and data/edition.json disagree.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA, ROOT, setup_logging  # noqa: E402
from diff_editions import norm  # noqa: E402

log = setup_logging("new_edition")
EDITION_FILE = DATA / "edition.json"


def fingerprint() -> str:
    """Same canonical form as app/src/lib/app.test.ts: JSON of [id, question, options] per question."""
    qs = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    canonical = json.dumps([[q["id"], q["question"], q["options"]] for q in qs], ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def migration(old: str, new: str) -> dict:
    diff_file = ROOT / "results" / f"edition_diff_{new}.json"
    if not diff_file.exists():
        raise SystemExit(f"{diff_file} is missing: run diff_editions.py --label {new} first")
    diff = json.loads(diff_file.read_text(encoding="utf-8"))
    reorder, unsafe = {}, []
    for change in diff["changed"]:
        before, after = change["before"], change["after"]
        if "options" in change["flags"]:
            unsafe.append(after["id"])
        elif "order" in change["flags"]:
            where = {norm(o): i for i, o in enumerate(after["options"])}
            reorder[after["id"]] = [where[norm(o)] for o in before["options"]]
    return {"from": old, "to": new, "ids": diff["id_map"], "removed": [r["id"] for r in diff["removed"]], "reorder": reorder, "unsafe": unsafe}


def write(data: dict) -> None:
    EDITION_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", help="date of the new edition")
    ap.add_argument("--init", help="create data/edition.json for this edition, with no migrations")
    args = ap.parse_args()
    if args.init:
        if EDITION_FILE.exists():
            raise SystemExit(f"{EDITION_FILE} already exists")
        write({"edition": args.init, "fingerprint": fingerprint(), "migrations": []})
        log.info(f"created {EDITION_FILE} for edition {args.init}")
        return
    if not args.label:
        raise SystemExit("give --label <date of the new edition>")
    data = json.loads(EDITION_FILE.read_text(encoding="utf-8"))
    now = fingerprint()
    if now == data["fingerprint"]:
        log.info(f"the questions are unchanged: edition stays {data['edition']}")
        return
    if args.label == data["edition"] or any(m["from"] == args.label for m in data["migrations"]):
        raise SystemExit(f"edition label {args.label} was already used")
    step = migration(data["edition"], args.label)
    data["migrations"].append(step)
    data["edition"], data["fingerprint"] = args.label, now
    write(data)
    log.info(f"edition {step['from']} -> {step['to']}: {len(step['ids'])} renumbered, {len(step['removed'])} removed, {len(step['reorder'])} reordered, {len(step['unsafe'])} with changed options")


if __name__ == "__main__":
    main()
