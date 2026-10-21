"""Parse the previous question pool and compare it with the current one, question by question.

    uv run python scripts/build_old_pool.py   # ~20 s (measured 17-19 s), no network; needs download_old_pool.py first

The old PDFs (official/old_pool/, Word exports from 2022) are two-column tables of question cards
with no question numbers and no colors: question text, picture, options "1.text", and an answer
line "Պատ․՝N" (with U+2024 ONE DOT LEADER, not a full stop; once "Պատ ՝3") closing the card. Cards
are read row by row, left then right, so an old id "old-<group>-<k>" is the k-th card of the group.
Two cards have their question only inside the picture (old-4-95, one in group 8).

Only the Armenian PDFs are parsed. The old English PDFs are a different, smaller edition (group 1:
132 answer lines vs 147), so a card-by-card comparison would compare different questions. The check
that remains is stronger anyway: of the 660 old questions whose wording and options are unchanged in
2026, none has a different answer.

Writes:
    data/old_pool/questions.json      every old Armenian question with its answer, the id of the
                                      matching current question (`new_id`, null if none) and what
                                      changed (`changes`: text, options, order, picture, answer)
    data/old_pool/images/             pictures of the old questions not in the current pool, or
                                      whose picture changed (the rest show the current picture)
    results/pool_diff.json            summary counts and every old/new pair

Matching (one-to-one, most certain first):
    1. same question text and the same set of options; several candidates (same wording, different
       picture) are told apart by perceptual picture hash (imagehash.phash)
    2. same question text, options changed, if the options (rapidfuzz >= SAME_OPTIONS) or the picture
       still resemble each other (33 group-3 questions share one stem)
    3. question only in the picture: same options, nearest picture
    4. fuzzy (rapidfuzz) on question + options, score >= FUZZY_MIN, picture distance as tie-breaker
Text is compared after removing everything but letters and digits, lowercasing, writing the
ligature "և" as "եւ" (the source mixes both) and the old Armenian picture labels Ա/Բ/Գ/Դ as A/B/C/D
(the new PDFs use Latin). "answer" in `changes` means the text of the correct option differs, which
also happens when it is only reworded; by reading every flagged pair, 3 are real key changes
(PATTERNS.md, "Old pool vs new pool").
"""

import io
import json
import re
import time
import unicodedata
from collections import Counter, defaultdict

import imagehash
import pymupdf
from PIL import Image
from rapidfuzz import fuzz, process

from common import DATA, GROUPS, OFFICIAL, ROOT, setup_logging

log = setup_logging("build_old_pool")

OLD = OFFICIAL / "old_pool"
# The dot is U+2024 or ".", and once missing ("Պատ ՝3", old group 4)
ANSWER_RE = re.compile(r"(?:Պատ\s*[.․]?\s*՝|Պատ[.․]|Ans\w*[.․]?)\s*[՝:`']?\s*(\d+)\s*$")
OPTION_RE = re.compile(r"^(\d+)\.\s*(.*)$")
FUZZY_MIN = 85
SAME_OPTIONS = 60  # min rapidfuzz token_sort_ratio of the joined options for a same-wording match
SAME_PICTURE = 10  # max phash distance (of 64 bits) for "same picture"; checked on the exact matches


def cards_of(path) -> list[dict]:
    """Split a PDF into cards: per page, each column is cut at its answer lines; rows interleave L, R."""
    doc = pymupdf.open(path)
    cards, carry = [], {0: None, 1: None}
    for pno, page in enumerate(doc, 1):
        mid = page.rect.width / 2
        cols = {0: [], 1: []}
        for b in page.get_text("dict")["blocks"]:
            col = 0 if b["bbox"][0] < mid else 1
            if b["type"] == 1:
                cols[col].append((b["bbox"][1], "img", b))
                continue
            for line in b["lines"]:
                text = " ".join("".join(s["text"] for s in line["spans"]).split())
                if text:
                    cols[col].append((line["bbox"][1], "txt", text))
        done = {0: [], 1: []}
        for c in (0, 1):
            cur = carry[c] or {"page": pno, "items": []}
            for _, kind, obj in sorted(cols[c], key=lambda it: it[0]):
                cur["items"].append((kind, obj))
                if kind == "txt" and ANSWER_RE.search(obj):
                    done[c].append(cur)
                    cur = {"page": pno, "items": []}
            carry[c] = cur if cur["items"] else None
        for i in range(max(len(done[0]), len(done[1]))):
            cards += [side[i] for side in (done[0], done[1]) if i < len(side)]
    left = [c for c in carry.values() if c]
    if left:
        raise ValueError(f"{path.name}: text after the last answer line: {left}")
    return cards


def parse_card(card: dict, where: str) -> dict:
    q, opts, answer, imgs = [], [], None, []
    for kind, obj in card["items"]:
        if kind == "img":
            imgs.append(obj)
            continue
        if m := ANSWER_RE.search(obj):
            answer = int(m.group(1))
            if pre := obj[: m.start()].strip():
                (opts[-1] if opts else q).append(pre)
            continue
        m = OPTION_RE.match(obj)
        if m and (q or imgs) and int(m.group(1)) == len(opts) + 1:
            opts.append([m.group(2)] if m.group(2) else [])
            continue
        (opts[-1] if opts else q).append(obj)
    options = [" ".join(o) for o in opts]
    # A few old cards have the question only inside the picture (e.g. old 4-95); no text, but a picture.
    if (not q and not imgs) or len(options) < 2 or any(not o for o in options):
        raise ValueError(f"{where} (page {card['page']}): question {q!r}, options {options}")
    if answer is None or not 1 <= answer <= len(options):
        raise ValueError(f"{where} (page {card['page']}): answer {answer} with {len(options)} options")
    if len(imgs) > 1:
        raise ValueError(f"{where} (page {card['page']}): {len(imgs)} pictures")
    return {"question": " ".join(q), "options": options, "answer_index": answer - 1,
            "image": imgs[0] if imgs else None, "pdf_page": card["page"]}


def parse_lang(lang: str) -> list[dict]:
    out = []
    for g in GROUPS:
        qs = [parse_card(c, f"old {lang} group {g} card {k}")
              for k, c in enumerate(cards_of(OLD / f"{lang}_group_{g}.pdf"), 1)]
        for k, q in enumerate(qs, 1):
            q.update(id=f"old-{g}-{k}", group=g, number=k)
        log.info(f"old {lang} group {g}: {len(qs)} questions, {sum(q['image'] is not None for q in qs)} with a picture")
        out += qs
    return out


# The old PDFs label picture marks with Armenian letters, the new ones with Latin ("Միայն Բ" -> "Միայն B").
LABELS = str.maketrans({"ա": "a", "բ": "b", "գ": "c", "դ": "d"})


def key(s: str) -> str:
    s = unicodedata.normalize("NFC", s).replace("և", "եւ").lower()
    s = re.sub(r"(?<![^\W\d_])[աբգդ](?![^\W\d_])", lambda m: m.group(0).translate(LABELS), s)  # lone letters only
    return "".join(ch for ch in s if ch.isalnum())


def phash(img_bytes: bytes):
    return imagehash.phash(Image.open(io.BytesIO(img_bytes)).convert("L"))


def match(old: list[dict], new: list[dict]) -> list[dict]:
    """Return one record per old question: matched new id (or None), how, changes, scores."""
    for q in old + new:
        q["_q"] = key(q["question"])
        q["_o"] = [key(o) for o in q["options"]]
        q["_a"] = q["_o"][q["answer_index"]]
        q["_full"] = q["_q"] + "|" + "|".join(q["_o"])
    used: set[str] = set()
    result: dict[str, dict] = {}
    new_by_id = {n["id"]: n for n in new}

    def dist(o, n):
        if o["_h"] is None or n["_h"] is None:
            return None if o["_h"] is None and n["_h"] is None else 64
        return int(o["_h"] - n["_h"])

    def pick(o, cands):
        """Nearest picture first; without pictures (same wording, e.g. group 3), the most similar options."""
        cands = [n for n in cands if n["id"] not in used]
        if not cands:
            return None
        return min(cands, key=lambda n: (dist(o, n) if dist(o, n) is not None else 0,
                                         -fuzz.token_sort_ratio(" ".join(o["_o"]), " ".join(n["_o"]))))

    by_text_opts = defaultdict(list)
    by_text = defaultdict(list)
    for n in new:
        by_text_opts[(n["_q"], tuple(sorted(n["_o"])))].append(n)
        by_text[n["_q"]].append(n)

    by_opts = defaultdict(list)
    for n in new:
        by_opts[tuple(sorted(n["_o"]))].append(n)
    steps = [
        ("exact", lambda o: by_text_opts.get((o["_q"], tuple(sorted(o["_o"]))), [])),
        # same wording is only a match if the options or the picture still resemble each other: 33 group-3
        # questions share one stem, so wording alone pairs unrelated questions
        ("same_question", lambda o: [n for n in by_text.get(o["_q"], [])
                                     if fuzz.token_sort_ratio(" ".join(o["_o"]), " ".join(n["_o"])) >= SAME_OPTIONS
                                     or (o["_h"] is not None and n["_h"] is not None and o["_h"] - n["_h"] <= SAME_PICTURE)]),
        # question text only in the picture: same options, nearest picture
        ("picture_question", lambda o: by_opts.get(tuple(sorted(o["_o"])), []) if not o["_q"] and o["_h"] is not None else []),
    ]
    for how, cands_of in steps:
        for o in old:
            if o["id"] in result:
                continue
            if n := pick(o, cands_of(o)):
                used.add(n["id"])
                result[o["id"]] = {"new_id": n["id"], "how": how}
    # fuzzy: best text candidates among the still unmatched current questions
    for o in old:
        if o["id"] in result:
            continue
        free = {n["id"]: n["_full"] for n in new if n["id"] not in used}
        hits = process.extract(o["_full"], free, scorer=fuzz.ratio, limit=5, score_cutoff=FUZZY_MIN)
        if hits:
            best = max(hits, key=lambda h: (h[1] - (dist(o, new_by_id[h[2]]) or 0)))
            used.add(best[2])
            result[o["id"]] = {"new_id": best[2], "how": "fuzzy", "score": round(best[1], 1)}

    records = []
    for o in old:
        r = result.get(o["id"], {"new_id": None, "how": "none"})
        changes = []
        if r["new_id"]:
            n = new_by_id[r["new_id"]]
            d = dist(o, n)
            r["picture_distance"] = d
            if o["_q"] != n["_q"]:
                changes.append("text")
            if sorted(o["_o"]) != sorted(n["_o"]):
                changes.append("options")
            elif o["_o"] != n["_o"]:
                changes.append("order")
            if d is not None and d > SAME_PICTURE:
                changes.append("picture")
            if o["_a"] != n["_a"]:
                changes.append("answer")
        records.append({"old_id": o["id"], **r, "changes": changes})
    return records


def main() -> None:
    t0 = time.time()
    old_hy = parse_lang("hy")
    # No card-by-card check against the old English PDFs: they are a different, smaller edition (group 1:
    # 132 answer lines in English vs 147 in Armenian), so position k is not the same question. The check
    # that remains: matched old/new questions must have the same correct answer (logged below).
    (ROOT / "results").mkdir(exist_ok=True)

    new = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    for n_ in new:
        n_["_h"] = phash((DATA / n_["image"]).read_bytes()) if n_["image"] else None
    for o in old_hy:
        o["_h"] = phash(o["image"]["image"]) if o["image"] else None
    records = match(old_hy, new)

    exact_d = [r["picture_distance"] for r in records if r["how"] == "exact" and r.get("picture_distance") is not None]
    log.info(f"picture distance on exact text matches: {sorted(Counter(exact_d).items())}")

    rec_by_id = {r["old_id"]: r for r in records}
    img_dir = DATA / "old_pool" / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    out = []
    for o in old_hy:
        r = rec_by_id[o["id"]]
        image = None
        if o["image"] and (r["new_id"] is None or "picture" in r["changes"]):
            image = f"old_pool/images/{o['id']}.{o['image']['ext']}"
            (DATA / image).write_bytes(o["image"]["image"])
        out.append({"id": o["id"], "group": o["group"], "number": o["number"], "question": o["question"],
                    "options": o["options"], "answer_index": o["answer_index"], "has_image": o["image"] is not None,
                    "image": image, "new_id": r["new_id"], "changes": r["changes"], "pdf_page": o["pdf_page"]})
    (DATA / "old_pool" / "questions.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    matched_new = {r["new_id"] for r in records if r["new_id"]}
    summary = {
        "old_questions": len(old_hy),
        "new_questions": len(new),
        "matched": len(matched_new),
        "matched_by": dict(Counter(r["how"] for r in records)),
        "identical": sum(1 for r in records if r["new_id"] and not r["changes"]),
        "changes": dict(Counter(c for r in records for c in r["changes"])),
        "old_only": [r["old_id"] for r in records if not r["new_id"]],
        "new_only": [n["id"] for n in new if n["id"] not in matched_new],
    }
    (ROOT / "results" / "pool_diff.json").write_text(
        json.dumps({"summary": summary, "pairs": records}, ensure_ascii=False, indent=1), encoding="utf-8")
    log.info(f"old {summary['old_questions']}, new {summary['new_questions']}, matched {summary['matched']} "
             f"{summary['matched_by']}, identical {summary['identical']}, changes {summary['changes']}, "
             f"old only {len(summary['old_only'])}, new only {len(summary['new_only'])}")
    log.info(f"done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
