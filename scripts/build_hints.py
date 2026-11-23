"""Work out which shortcut applies to each question, for the hint shown after answering in the app.

    uv run python scripts/build_hints.py   # ~2 s, no network; needs data/questions.json

Uses the rule functions of mine_patterns.py, so the app and PATTERNS.md count the same thing. Writes data/hints.json:

    summary   per rule: on how many questions it fires and on how many it gives the official answer
    hints     per question id: the one rule to show (the most reliable that fires), whether it holds here, and for
              "never" the option indices that can be crossed out

The "design" rule is about conditions, not options: in group 3 a condition worded "կառուցվածքով (չ)նախատեսված" always
prohibits, so the answer is that condition or "both", never the other single condition.
"""

import json
import time

import mine_patterns as m
from common import DATA, setup_logging

log = setup_logging("build_hints")

# Most reliable first: a question shows only the first rule that fires.
PICKERS = {
    "pedestrians_too": m.r_pedestrians_too,
    "tram_yes": m.r_tram_yes,
    "g8_middle": m.r_g8_middle,
    "backing_no": m.r_backing_no,
    "g2_definition_longest": m.r_g2_definition_longest,
    "obligatory": m.r_obligatory,
    "g10_longest": m.r_g10_longest,
    "all_both": m.r_all_both,
}


def design_rule(q: dict) -> bool | None:
    """Group 3: True if the answer respects the rule, None if no condition has the wording."""
    if q["group"] != 3:
        return None
    conditions = q["options"][:-1]
    design = [i for i, c in enumerate(conditions) if m.DESIGN_RE.search(m.norm(c))]
    if not design:
        return None
    return q["answer_index"] == len(q["options"]) - 1 or q["answer_index"] in design


def main() -> None:
    t0 = time.time()
    qs = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    summary = {name: {"fires": 0, "right": 0} for name in ["design", "never", *PICKERS]}
    hints: dict[str, dict] = {}

    def note(name: str, q: dict, works: bool, **extra) -> None:
        summary[name]["fires"] += 1
        summary[name]["right"] += int(works)
        hints.setdefault(q["id"], {"rule": name, "works": works, **extra})

    for q in qs:
        works = design_rule(q)
        if works is not None:
            note("design", q, works)
        never = [i for i, o in enumerate(q["options"]) if m.NEVER_RE.search(m.norm(o))]
        if never:
            if q["answer_index"] in never:
                raise ValueError(f"{q['id']}: the never-pick list crosses out the official answer")
            note("never", q, True, options=never)
        for name, pick in PICKERS.items():
            i = pick(q)
            if i is not None:
                note(name, q, i == q["answer_index"])

    out = {"summary": summary, "hints": hints}
    (DATA / "hints.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for name, s in summary.items():
        log.info(f"{name:24} right {s['right']:3} of {s['fires']:3}")
    log.info(f"{len(hints)} of {len(qs)} questions get a hint; done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
