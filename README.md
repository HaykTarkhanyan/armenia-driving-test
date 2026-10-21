# Armenian driving theory exam (category B, A/B/C question set)

All 1,050 official questions of the Armenian theory exam for a car licence, in Armenian, with the
correct answer and the picture of every picture question, taken from the Road Police's own PDFs and
checked against their English version. Facts checked on 2026-10-21.

Status: dataset and exam rules done. Next: answer-pattern analysis ("shortcuts"), a study app on
GitHub Pages, short lessons per topic, an exam-day guide.

## What is in this repo

| Path | What it is |
|---|---|
| [`questions/group_01.md`](questions/group_01.md) ... `group_10.md` | All questions per group, correct answer bold with ✅, pictures inline. Start here. |
| `data/questions.json` / `.csv` | Same, machine-readable: `id` ("4-145" = group 4, question 145), `question`, `options` (2-5), `answer_index` (0-based; the CSV's `answer` is 1-based like the PDF), `image` |
| `data/images/` | 715 pictures, exactly as embedded in the PDFs (66 MB) |
| [`_knowledge/exam_rules.md`](_knowledge/exam_rules.md) | The exam rules from the law in force, quoted word for word, and which PDF group is which exam section |
| `official/manifest.json` | URL, version date, size and SHA-256 of each downloaded PDF (the PDFs themselves are not in git) |
| `results/crosscheck_en.json` | Armenian vs English PDFs, question by question: 0 differences |
| `scripts/` | `download_pdfs.py`, `build_dataset.py` |
| `DECISIONS.md`, `CONVENTIONS.md`, `_learnings/` | Why things are built this way, rules for the data, gotchas found on the way |

## The exam in one paragraph

Computer test in Armenian, Russian, English, Farsi or Arabic. First 3 psychological questions: all
three must be right, otherwise you cannot answer the rest. Then 20 knowledge questions with 2-5
options each, **30 minutes, at least 18 correct to pass** (at most 2 mistakes). The 20 are drawn at
random by section: 2 on the Road Traffic Safety Law (PDF group 2), 15 on the traffic rules (groups
1, 4-9), 2 on faults and conditions that prohibit driving (group 3), 1 on first aid (group 10). Fee
3,000 AMD; a pass is valid for one year for the practical exam. An automatic gearbox matters only for
the practical exam (the licence is then marked "automatic only"). Source: Government Decision
385-Ն, consolidated text on ARLIS, and the roadpolice.am FAQ, quoted in `_knowledge/exam_rules.md`.

**Mind the date.** Decision 979-Ն (in force 04.07.2026) split the pool into A/B/C and D/T, and the
PDFs here were published 2026-10-02 (group 4: 2026-10-05). By point 16 of 385-Ն, new questions may
be used only 30 days after publication, so an exam before about 2026-11-01 may still draw from the
previous pool (archived in the Wayback Machine from June 2026).

## Where the answers come from

https://www.roadpolice.am/hy/viv-exam links one PDF per group and language; each PDF prints the
correct option in green and adds a "Պատ.՝ N" line. `scripts/build_dataset.py` reads both and stops
if they disagree (they agree on all 1,050), checks each group's count against the number on its
title page, and parses the English PDFs the same way: same options count, same answer and
byte-identical picture for every question. Two random pages were also compared by eye with the
extracted text.

Repatarmenia.org and other pages still quote 1,116 questions; that is the old pool. The current
A/B/C pool has 1,050 (145, 82, 59, 179, 136, 95, 129, 55, 119, 51 per group).

## Rebuild

Needs `uv` (Python 3.12+); `uv sync` once.

```
uv run python scripts/download_pdfs.py   # ~2 min (measured 105 s), 20 PDFs (Armenian + English), skips unchanged groups
uv run python scripts/build_dataset.py   # ~5 s, writes data/, questions/, results/crosscheck_en.json
```

## Sources

- Road Police, question PDFs: https://www.roadpolice.am/hy/viv-exam
- Road Police, FAQ (fees, validity, fast retake): https://www.roadpolice.am/hy/faq
- Government Decision N 385-Ն (26.03.2020), exam procedure, consolidated: https://www.arlis.am/hy/acts/227433/latest
