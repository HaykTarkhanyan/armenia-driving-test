"""Build the question dataset from the official PDFs in official/ (see download_pdfs.py).

    uv run python scripts/build_dataset.py      # ~5 s (measured 4.5 s), no network

Writes:
    data/questions.json, data/questions.csv     all A/B/C questions, Armenian, with the correct answer
    data/images/<group>-<number>.<ext>          the picture of each picture question, bytes as embedded in the PDF
    questions/group_NN.md                       readable list per group, pictures inline
    results/crosscheck_en.json                  Armenian vs English PDFs: same options count, answer, picture

The PDFs are laid out by a generator (ReportLab) with fixed positions and colors, so every text line
is classified by its x position, font size and color instead of by regex on plain text:

    x=43  blue, 10.6 pt          question number ("12."; for 3-digit numbers the text starts on the same line)
    x=69  10.6 pt semibold       question text (wrapped lines too)
    x=69  10 pt, grey or green   option number; green = the correct option
    x=89  10 pt                  option text (a line with no option number beside it continues the option)
    x=69  9.4 pt bold, green     answer line "Պատ.՝ N" (English: "Answer: N")
    8.5 pt                       running header and page footer, skipped

The answer is read twice, from the answer line and from the green option, and the build fails if they
disagree. It also fails on: a question count different from the group header, numbering gaps,
fewer than 2 options, option numbers out of order, more than one picture per question, any line
that fits no role.
"""

import csv
import hashlib
import json
import re
import time
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

from common import DATA, GROUPS, OFFICIAL, ROOT, setup_logging

log = setup_logging("build_dataset")

GREEN = 0x12703A
BLUE = 0x0F5BA7
GREY = 0x6B7280
DARK = 0x1B1B1F

QUESTION_X, BODY_X, OPTION_TEXT_X = 43, 69, 89
X_TOL = 3.0      # pt; positions are exact in practice, tolerance only absorbs rounding
SAME_ROW = 2.0   # pt; option number and option text share a baseline

COUNT_RE = re.compile(r"^(\d+)\s+\S+$")            # "145 հարց" / "145 questions" on the title band
QNUM_RE = re.compile(r"^(\d+)\.\s*(.*)$")
OPTNUM_RE = re.compile(r"^(\d+)\.$")
ANSWER_RE = re.compile(r"(\d+)\s*$")


@dataclass
class Question:
    group: int
    number: int
    page: int
    text: list[str] = field(default_factory=list)
    options: list[list[str]] = field(default_factory=list)
    option_green: list[bool] = field(default_factory=list)
    answer_line: int | None = None
    images: list[dict] = field(default_factory=list)

    @property
    def id(self) -> str:
        return f"{self.group}-{self.number}"


def near(a: float, b: float) -> bool:
    return abs(a - b) <= X_TOL


def parse_pdf(path: Path, group: int) -> tuple[int, list[Question]]:
    """Return (question count from the title band, parsed questions) for one group PDF."""
    doc = pymupdf.open(path)
    header_count = None
    questions: list[Question] = []
    q: Question | None = None
    last_optnum_y = None  # y of the last option number, to tell a new option from a wrapped line

    for pno, page in enumerate(doc, 1):
        items = []
        for b in page.get_text("dict")["blocks"]:
            if b["type"] == 1:
                items.append((b["bbox"][1], b["bbox"][0], "img", b))
                continue
            for line in b["lines"]:
                y, text = line["bbox"][1], "".join(s["text"] for s in line["spans"]).strip()
                if pno == 1 and y < 130:  # title band: group name, subtitle, "<N> questions"
                    if m := COUNT_RE.match(text):
                        header_count = int(m.group(1))
                    continue
                if not text or round(line["spans"][0]["size"], 1) == 8.5:  # running header, footer
                    continue
                items.append((y, line["bbox"][0], "txt", line))
        # Keep the drawing order (top to bottom, number before its text); sorting by y could swap an
        # option number and its text when the two fonts sit a fraction of a point apart.
        ys = [it[0] for it in items]
        if any(b < a - SAME_ROW for a, b in zip(ys, ys[1:])):
            raise ValueError(f"{path.name} p{pno}: drawing order is not top to bottom")

        for y, x, kind, obj in items:
            if kind == "img":
                if q is None:
                    raise ValueError(f"{path.name} p{pno}: picture before the first question")
                q.images.append({"ext": obj["ext"], "bytes": obj["image"], "w": obj["width"], "h": obj["height"]})
                continue

            spans = obj["spans"]
            text = "".join(s["text"] for s in spans).strip()
            size = round(spans[0]["size"], 1)
            color = spans[0]["color"]

            if near(x, QUESTION_X) and color == BLUE and (m := QNUM_RE.match(text)):
                q = Question(group=group, number=int(m.group(1)), page=pno)
                questions.append(q)
                if m.group(2):
                    q.text.append(m.group(2))
                last_optnum_y = None
                continue
            if q is None:
                raise ValueError(f"{path.name} p{pno}: text before the first question: {text!r}")

            if near(x, BODY_X) and size == 10.6:
                if q.options:
                    raise ValueError(f"{q.id}: question text after the options: {text!r}")
                q.text.append(text)
            elif near(x, BODY_X) and size == 9.4:
                if color != GREEN or not (m := ANSWER_RE.search(text)):
                    raise ValueError(f"{q.id}: unexpected answer line {text!r} color {color:#x}")
                q.answer_line = int(m.group(1))
            elif near(x, BODY_X) and size == 10.0 and (m := OPTNUM_RE.match(text)):
                if int(m.group(1)) != len(q.options) + 1:
                    raise ValueError(f"{q.id}: option number {m.group(1)} after {len(q.options)} options")
                if color not in (GREEN, GREY):
                    raise ValueError(f"{q.id}: option number color {color:#x}")
                q.options.append([])
                q.option_green.append(color == GREEN)
                last_optnum_y = y
            elif near(x, OPTION_TEXT_X) and size == 10.0:
                if not q.options:
                    raise ValueError(f"{q.id}: option text before any option number: {text!r}")
                is_new = last_optnum_y is not None and abs(y - last_optnum_y) <= SAME_ROW
                if not is_new and not q.options[-1]:
                    raise ValueError(f"{q.id}: option {len(q.options)} has a number but no text on its row")
                if (color == GREEN) != q.option_green[-1]:
                    raise ValueError(f"{q.id}: option {len(q.options)} number and text differ in color")
                q.options[-1].append(text)
                last_optnum_y = None if not is_new else last_optnum_y
            else:
                raise ValueError(f"{path.name} p{pno} {q.id}: line fits no role: x={x:.0f} size={size} "
                                 f"color={color:#x} {text!r}")
    if header_count is None:
        raise ValueError(f"{path.name}: no question count on the title band")
    return header_count, questions


def check(group: int, header_count: int, questions: list[Question]) -> None:
    numbers = [q.number for q in questions]
    if numbers != list(range(1, header_count + 1)):
        raise ValueError(f"group {group}: header says {header_count} questions, numbering is "
                         f"{numbers[:3]}...{numbers[-3:]} ({len(numbers)} found)")
    for q in questions:
        if not q.text:
            raise ValueError(f"{q.id}: empty question text")
        if len(q.options) < 2:
            raise ValueError(f"{q.id}: {len(q.options)} options")
        if any(not o for o in q.options):
            raise ValueError(f"{q.id}: an option without text")
        green = [i + 1 for i, g in enumerate(q.option_green) if g]
        if len(green) != 1:
            raise ValueError(f"{q.id}: {len(green)} green options")
        if q.answer_line != green[0]:
            raise ValueError(f"{q.id}: answer line says {q.answer_line}, green option is {green[0]}")
        if len(q.images) > 1:
            raise ValueError(f"{q.id}: {len(q.images)} pictures")


def build_lang(lang: str) -> list[Question]:
    out = []
    for g in GROUPS:
        header_count, qs = parse_pdf(OFFICIAL / f"abc_{lang}_{g}.pdf", g)
        check(g, header_count, qs)
        log.info(f"{lang} group {g}: {len(qs)} questions, {sum(bool(q.images) for q in qs)} with a picture")
        out.extend(qs)
    return out


def join(lines: list[str]) -> str:
    return " ".join(lines)


def write_outputs(questions: list[Question]) -> None:
    img_dir = DATA / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    records = []
    for q in questions:
        image = None
        if q.images:
            im = q.images[0]
            image = f"images/{q.id}.{im['ext']}"
            (DATA / image).write_bytes(im["bytes"])
        records.append({
            "id": q.id,
            "group": q.group,
            "number": q.number,
            "question": join(q.text),
            "options": [join(o) for o in q.options],
            "answer_index": q.answer_line - 1,
            "image": image,
            "pdf_page": q.page,
        })
    (DATA / "questions.json").write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8")

    max_opts = max(len(r["options"]) for r in records)
    with open(DATA / "questions.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "group", "number", "question", *[f"option_{i}" for i in range(1, max_opts + 1)],
                    "answer", "image"])
        for r in records:
            opts = r["options"] + [""] * (max_opts - len(r["options"]))
            w.writerow([r["id"], r["group"], r["number"], r["question"], *opts, r["answer_index"] + 1,
                        r["image"] or ""])

    md_dir = ROOT / "questions"
    md_dir.mkdir(exist_ok=True)
    for g in GROUPS:
        rows = [r for r in records if r["group"] == g]
        lines = [f"# Խումբ {g} ({len(rows)} հարց)", "",
                 "Ճիշտ պատասխանը **թավ** է և նշված ✅-ով։ Աղբյուր՝ roadpolice.am, ABC կարգեր։", ""]
        for r in rows:
            lines.append(f"### {r['id']}. {r['question']}")
            lines.append("")
            if r["image"]:
                lines += [f"![{r['id']}](../data/{r['image']})", ""]
            for i, o in enumerate(r["options"]):
                lines.append(f"{i + 1}. **{o}** ✅" if i == r["answer_index"] else f"{i + 1}. {o}")
            lines.append("")
        (md_dir / f"group_{g:02d}.md").write_text("\n".join(lines), encoding="utf-8")


def crosscheck(hy: list[Question], en: list[Question]) -> dict:
    """Compare the Armenian and English PDFs question by question."""
    en_by_id = {q.id: q for q in en}
    diffs = []
    for q in hy:
        e = en_by_id.get(q.id)
        if e is None:
            diffs.append({"id": q.id, "issue": "missing in English"})
            continue
        if len(q.options) != len(e.options):
            diffs.append({"id": q.id, "issue": f"options hy={len(q.options)} en={len(e.options)}"})
        if q.answer_line != e.answer_line:
            diffs.append({"id": q.id, "issue": f"answer hy={q.answer_line} en={e.answer_line}"})
        hy_img = hashlib.sha256(q.images[0]["bytes"]).hexdigest() if q.images else None
        en_img = hashlib.sha256(e.images[0]["bytes"]).hexdigest() if e.images else None
        if hy_img != en_img:
            diffs.append({"id": q.id, "issue": "picture differs" if hy_img and en_img
                          else f"picture only in {'hy' if hy_img else 'en'}"})
    extra = sorted(set(en_by_id) - {q.id for q in hy})
    diffs += [{"id": i, "issue": "missing in Armenian"} for i in extra]
    return {"armenian": len(hy), "english": len(en), "differences": diffs}


def main() -> None:
    t0 = time.time()
    hy = build_lang("hy")
    write_outputs(hy)
    log.info(f"wrote {len(hy)} Armenian questions to data/, questions/")

    en = build_lang("en")
    report = crosscheck(hy, en)
    (ROOT / "results").mkdir(exist_ok=True)
    (ROOT / "results" / "crosscheck_en.json").write_text(json.dumps(report, ensure_ascii=False, indent=1),
                                                       encoding="utf-8")
    n = len(report["differences"])
    (log.warning if n else log.info)(f"Armenian vs English: {n} differences (results/crosscheck_en.json)")
    for d in report["differences"][:20]:
        log.warning(f"  {d['id']}: {d['issue']}")
    log.info(f"done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
