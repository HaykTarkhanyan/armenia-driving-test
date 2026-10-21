# Decisions

Newest first.

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
