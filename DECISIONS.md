# Decisions

Newest first.

## 6. Shortcut analysis: per-question guess baseline, folds grouped by wording, exact pass model, "exceptions" baseline

- **Date / status:** 2026-10-21, active (Hayk asked for the same shortcut analysis as in the German project)
- **Why:** Options vary from 2 to 5, so a rule is scored against the sum of 1/k over the questions it fires on, not a flat 25%. 26% of questions share their wording with another (only the picture differs), so cross-validation folds are grouped by normalized wording; otherwise word rules learn answers from twins. P(pass) is exact (dynamic program per section over which questions are drawn, then convolved: 2 of 82, 2 of 59, 1 of 51, 15 of 858, at least 18 of 20), so no simulation noise. A "position only" strategy was added after the first run: with the usual-position fallback the memorize count fell from 601 to 476 for 50%, although that fallback is no better than guessing held out (253 vs 255); the drop came from "learn only what your fixed rule gets wrong", which works for any fixed rule. Against that baseline the real patterns save 22 answers at 95% (598 -> 576). Verdict in PATTERNS.md.
- **Alternatives rejected:** Monte Carlo for P(pass) (noisy, slower, the exact model is cheap); random folds (leak twins); reporting only the rule list vs guessing (would credit the patterns with ~350 answers of saving that any fixed rule gets).
- **What would change this:** Evidence on whether the computer test keeps the PDF option order (decides which rows of the table apply), or a published per-group quota for the 15 traffic-rule questions (then draw per group).

## 5. Recover the previous pool (June 2026) from the Wayback Machine and match it to the current one

- **Date / status:** 2026-10-21, active (Hayk, not sure of the exam date: "get both pls")
- **Why:** By point 16 of Decision 385-Ն new questions may be used only 30 days after publication; the current PDFs were published 2026-10-02, so an exam before about 2026-11-01 may still draw from the previous pool. roadpolice.am now answers 404 for the old files (/exam/hy_group_N.pdf), but the Wayback Machine captured them on 2026-06-08 (the old PDFs are Word exports created 2022-04-13, so the old pool dates from 2022). The old PDFs have no question numbers and no green answer, so the old Armenian text is checked against the old English PDFs, and the questions found in both pools must agree with the current answers. Matching is one-to-one: same wording and options first, then same wording, then fuzzy text (rapidfuzz 3.14.6, score >= 85); same-wording twins are told apart by perceptual picture hash (imagehash 4.3.2), since old pictures are 600x300 and new ones 1200x600, so byte hashes never match.
- **Alternatives rejected:** ignoring the old pool (wrong if the exam is before November); third-party apps for the old pool (unofficial copies; the archive has the official files); difflib for fuzzy matching (1,116 x 1,050 comparisons take minutes in pure Python, rapidfuzz takes seconds); hand-written picture hashing (imagehash is the standard package for this).
- **What would change this:** The exam date passing 2026-11-01 (then the old pool is history; keep the data, drop it from practice), or roadpolice.am publishing a list of changes.

## 4. The official PDFs stay out of git; a manifest pins them, the extracted pictures are committed

- **Date / status:** 2026-10-21, active
- **Why:** The 10 Armenian A/B/C PDFs are 84 MB together (the English ones as much again), and everything in them ends up in the repo anyway: the text in `data/questions.json`, the pictures in `data/images/` (715 files, 66.1 MB, the JPEG bytes exactly as embedded). `official/manifest.json` records URL, the site's version stamp, size and SHA-256 per file, so a later download shows at once which groups changed. The pictures are kept as the original bytes (no re-encoding) so they can be compared with a later download byte for byte; the app can still serve smaller copies.
- **Alternatives rejected:** committing the PDFs (doubles the repo for no new content); Git LFS (another tool for files that are rebuilt from a public URL anyway); re-encoding the pictures to WebP now (loses the byte-for-byte comparison; decide when the app needs it).
- **What would change this:** roadpolice.am replacing the PDFs without a way to get the old ones back while we need to diff old vs new (then keep dated copies, e.g. as GitHub release assets).

## 3. Extract by layout with PyMuPDF 1.28.2, reading the answer twice

- **Date / status:** 2026-10-21, active
- **Why:** The PDFs come from a generator (ReportLab) with fixed positions and colors, so each line is classified by x position, font size and color (`scripts/build_dataset.py` docstring has the table), and pictures come with their position, so each is tied to the question it sits in. The correct answer is read twice, from the "Պատ.՝ N" line and from the option printed in green; they agree on all 1,050 questions. The build fails on any line that fits no role, a count different from the group header, numbering gaps, or more than one picture per question. Result: 1,050 questions (groups of 145, 82, 59, 179, 136, 95, 129, 55, 119, 51), 715 with a picture; two random pages compared by eye with the extracted text: identical.
- **Alternatives rejected:** `pdftotext` (poppler) - turns the Armenian into junk bytes (it falls back to the fonts' WinAnsi encoding); pypdf - extracts Armenian correctly but gives no positions or colors, so pictures could only be matched to questions by order on the page; OCR - not needed, the text layer is correct; PyMuPDF 2.0 - same API, but pulls in onnxruntime, numpy and networkx for a layout model we do not use.
- **What would change this:** A new PDF layout (the build will stop with "line fits no role"), or roadpolice.am publishing the questions in a structured form.

## 2. A/B/C category set only, Armenian only; English PDFs used only as a cross-check

- **Date / status:** 2026-10-21, active (Hayk: "just a regular car, automatic"; app language "only armenian")
- **Why:** A car licence is category B, which uses the A/B/C question set; automatic vs manual gearbox does not change the theory exam. The dataset and the app carry only the Armenian text. The English PDFs are downloaded and parsed with the same code to check that the two official versions agree: same number of questions, options and answer number for all 1,050, and byte-identical pictures (`results/crosscheck_en.json`: 0 differences). Nothing English is shipped.
- **Alternatives rejected:** the D/T set (buses, tractors: not Hayk's licence); Russian or English as app languages (Hayk chose Armenian only); skipping the English check (it costs nothing and is an independent second reading of the answer key).
- **What would change this:** Someone else using the app who needs Russian or English (the same parser reads those PDFs).

## 1. Questions come from the official roadpolice.am PDFs, downloaded directly

- **Date / status:** 2026-10-21, active (Hayk asked for a Playwright browsing session; asked "why not just use playwright"; the direct download was explained and the work went on)
- **Why:** https://www.roadpolice.am/hy/viv-exam is a list of 100 PDF links (10 groups x 5 languages x 2 category sets), and each PDF holds the question, the options, the correct answer and the picture. A browser would download the same files; a script does it reproducibly (`scripts/download_pdfs.py`, ~105 s for 20 files) and only re-downloads groups whose version stamp changed. The pool was regenerated on 2026-10-02 (Armenian group 4 again on 2026-10-05), so third-party apps and pages may be stale: repatarmenia.org still quotes 1,116 questions, the official pool now has 1,050.
- **Alternatives rejected:** clicking through with Playwright (same files, slower, the MCP server hung in the German project); third-party apps such as drv.am or varord.am (unofficial copies, maybe of the old pool; still useful later as a cross-check).
- **What would change this:** The site dropping the PDFs for an interactive test only (then Playwright), or the PDFs disagreeing with what the real exam shows.
