# Armenian driving theory exam (category B, A/B/C question set)

All 1,050 official questions of the Armenian theory exam for a car licence, in Armenian, with the
correct answer and the picture of every picture question, taken from the Road Police's own PDFs and
checked against their English version. Facts checked on 2026-10-21.

Status: dataset, exam rules, the previous pool (2022-2026) with a question-by-question diff, and a
group-by-group shortcut and logic analysis are done. Parked: study app, lessons, exam-day guide.

**Shortcuts, in one line:** none get near a pass (the exam needs 18 of 20; guessing scores 7.2, all
rules together 9.0), but the logic in the pool cuts what you must memorize for a 95% pass from 952
answers to 714, and three answers in the official key contradict the law. Start with
[`PATTERNS.md`](PATTERNS.md).

## What is in this repo

| Path | What it is |
|---|---|
| [`questions/group_01.md`](questions/group_01.md) ... `group_10.md` | All questions per group, correct answer bold with ✅, pictures inline. Start here. |
| `data/questions.json` / `.csv` | Same, machine-readable: `id` ("4-145" = group 4, question 145), `question`, `options` (2-5), `answer_index` (0-based; the CSV's `answer` is 1-based like the PDF), `image` |
| `data/images/` | 715 pictures, exactly as embedded in the PDFs (66 MB) |
| [`_knowledge/exam_rules.md`](_knowledge/exam_rules.md) | The exam rules from the law in force, quoted word for word, and which PDF group is which exam section |
| `official/manifest.json` | URL, version date, size and SHA-256 of each downloaded PDF (the PDFs themselves are not in git) |
| `results/crosscheck_en.json` | Armenian vs English PDFs, question by question: 0 differences |
| [`PATTERNS.md`](PATTERNS.md) | Are there answer shortcuts? 14 rules tested, held-out scores, exact pass chances, how many answers to learn, what to learn first |
| `reports/patterns_report.html` | Interactive report for the shortcut analysis (open in a browser; one standalone file) |
| `results/patterns.json` | Raw results of the shortcut analysis (the report is built from it) |
| [`_knowledge/answer_key_errors.md`](_knowledge/answer_key_errors.md) | Where the official key contradicts itself or the law (horn, railway-crossing parking), with the law quoted |
| `_knowledge/shortcut_hunt_*.md` | Notes from reading every question of every group: fact sheets, tells, give-aways |
| `data/old_pool/questions.json` | The previous pool (1,094 questions, PDFs from 2022, online until autumn 2026), each with the matching current question (`new_id`) and what changed; pictures only for removed or redrawn ones |
| `results/pool_diff.json` | Old vs new pool, pair by pair |
| `official/old_pool/manifest.json` | Wayback Machine capture, size and SHA-256 of each old PDF |
| `scripts/` | `download_pdfs.py`, `build_dataset.py` (dataset); `download_old_pool.py`, `build_old_pool.py` (old pool); `mine_patterns.py`, `build_pattern_report.py` (shortcuts) |
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
previous pool. That pool is in `data/old_pool/`: 118 of its questions are gone (mostly bus, truck and
tractor questions), 74 are new, and 3 kept questions changed their answer (1-34, 1-35, 2-75; see
PATTERNS.md).

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
uv run python scripts/download_old_pool.py   # ~5-15 min, the 2022 pool from the Wayback Machine (slow, resumable)
uv run python scripts/build_old_pool.py   # ~20 s -> data/old_pool/, results/pool_diff.json
uv run python scripts/mine_patterns.py   # ~45 s -> results/patterns.json (needs the old pool)
uv run python scripts/build_pattern_report.py   # ~2 s -> reports/patterns_report.html
```

## Sources

- Road Police, question PDFs: https://www.roadpolice.am/hy/viv-exam
- Road Police, FAQ (fees, validity, fast retake): https://www.roadpolice.am/hy/faq
- Government Decision N 385-Ն (26.03.2020), exam procedure, consolidated: https://www.arlis.am/hy/acts/227433/latest
- Government Decision N 955-Ն (28.06.2007), traffic rules and faults prohibiting operation, consolidated: https://www.arlis.am/hy/acts/212587/latest
- Previous question PDFs (2022 editions, captured 2026-06-08): https://web.archive.org/web/20260608181424/https://roadpolice.am/hy/viv-exam
