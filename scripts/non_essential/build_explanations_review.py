"""Build a standalone HTML page for reviewing the explanations: picture, question, right answer, explanation, source.

    uv run python scripts/non_essential/build_explanations_review.py   # ~2 s for 30 questions -> reports/explanations_review.html
"""

import base64
import html
import io
import json
import sys
import time
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import DATA, ROOT, setup_logging  # noqa: E402

log = setup_logging("build_explanations_review")
OUT = ROOT / "reports" / "explanations_review.html"
RULES_URL = "https://www.arlis.am/hy/acts/212587/latest"
SOURCES = {
    "rules": ("Երթևեկության կանոններ (955-Ն)", RULES_URL),
    "faults": ("Շահագործումն արգելող անսարքություններ (955-Ն, հավելված 2)", RULES_URL),
    "law": ("ՀՀ օրենք ՀՕ-166-Ն", "https://www.arlis.am/hy/acts/1857/latest"),
    "cdc": ("CDC", "https://www.cdc.gov/epilepsy/first-aid-for-seizures/index.html"),
    "mayo": ("Mayo Clinic", "https://www.mayoclinic.org/first-aid/first-aid-basics/art-20056604"),
}
CSS = """
:root{--bg:#f4f5f8;--card:#fff;--ink:#1c2128;--muted:#59626e;--line:#dde1e7;--ok:#def3e8;--link:#2f62d6}
@media (prefers-color-scheme:dark){:root{--bg:#191c21;--card:#23272e;--ink:#edf0f4;--muted:#a3acb8;--line:#383e47;--ok:#1c3b2e;--link:#8fb0f5}}
*{box-sizing:border-box}body{margin:0 auto;padding:16px;max-width:760px;background:var(--bg);color:var(--ink);font:16px/1.55 "Noto Sans Armenian",system-ui,sans-serif}
a{color:var(--link)}nav{display:flex;flex-wrap:wrap;gap:6px 14px;margin:12px 0 18px}summary{padding:8px 0;font-size:1.15rem;font-weight:700;cursor:pointer}
article{margin:0 0 14px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--card)}article img{display:block;width:100%;height:auto;margin:8px 0;border-radius:8px}
.id{color:var(--muted);font-size:.85rem}.q{margin:2px 0 8px;font-weight:650}ul{margin:0 0 10px;padding:0;list-style:none}li{margin:3px 0;padding:5px 9px;border:1px solid var(--line);border-radius:7px}
li.right{border-color:transparent;background:var(--ok);font-weight:650}.why{margin:0 0 5px}.src{color:var(--muted);font-size:.84rem}
"""


def picture(path: str) -> str:
    image = Image.open(DATA / path).convert("RGB")
    image.thumbnail((720, 720))
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=72, optimize=True)
    return f"data:image/jpeg;base64,{base64.b64encode(buffer.getvalue()).decode('ascii')}"


def card(q: dict, e: dict) -> str:
    image = f'<img src="{picture(q["image"])}" alt="Հարց {q["id"]}-ի նկարը">' if q["image"] else ""
    options = "".join(f'<li class="right">✓ {html.escape(o)}</li>' if i == q["answer_index"] else f"<li>{html.escape(o)}</li>" for i, o in enumerate(q["options"]))
    label, url = SOURCES[e["source"]]
    ref = f", {html.escape(e['ref'])}" if e["ref"] else ""
    return (
        f'<article id="q{q["id"]}"><div class="id">{q["id"]}</div><p class="q">{html.escape(q["question"])}</p>{image}<ul>{options}</ul>'
        f'<p class="why"><b>Ինչո՞ւ</b> {html.escape(e["text"])}</p><div class="src">Աղբյուր՝ <a href="{url}">{label}</a>{ref}</div></article>'
    )


def main() -> None:
    start = time.time()
    questions = {q["id"]: q for q in json.loads((DATA / "questions.json").read_text(encoding="utf-8"))}
    explanations = json.loads((DATA / "explanations.json").read_text(encoding="utf-8"))["explanations"]
    groups: dict[int, list[str]] = {}
    for qid in explanations:
        groups.setdefault(questions[qid]["group"], []).append(qid)
    toc = "".join(f'<a href="#g{g}">Խումբ {g} ({len(groups[g])})</a>' for g in sorted(groups))
    sections = "".join(
        f'<section id="g{g}"><details open><summary>Խումբ {g} ({len(groups[g])})</summary>'
        + "".join(card(questions[qid], explanations[qid]) for qid in sorted(groups[g], key=lambda i: questions[i]["number"]))
        + "</details></section>"
        for g in sorted(groups)
    )
    page = (
        f'<!doctype html><html lang="hy"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>Բացատրությունների ստուգում</title><style>{CSS}</style></head><body><h1>Բացատրությունների ստուգում</h1>"
        f"<p>{len(explanations)} հարց 1050-ից։</p><nav>{toc}</nav>{sections}</body></html>"
    )
    OUT.write_text(page, encoding="utf-8", newline="\n")
    log.info(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB, {len(explanations)} questions) in {time.time() - start:.1f}s")


if __name__ == "__main__":
    main()
