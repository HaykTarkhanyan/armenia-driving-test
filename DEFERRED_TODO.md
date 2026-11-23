# Deferred TODO

Parked ideas, not started.

- **D/T category set** (buses, tractors) - same site, same layout; only if someone needs it (DECISIONS.md #2).
- **Russian / English in the app** - the parser already reads those PDFs; only if someone else uses the app.
- **Cross-check against a third-party app** (drv.am, varord.am) - would show whether they track the 2026-10-02 pool; our answers already agree between the Armenian and English official PDFs.
- **Watch for a new pool** - re-run `scripts/download_pdfs.py`; it re-downloads only groups whose version stamp changed, then rebuild.
- **Own Google OAuth client** - sign-in uses Neon's shared credentials, so Google's screen shows Neon's name. Steps are in `backend/README.md`.
- **A real contact in the privacy notice** - it names the GitHub account and issue page. GDPR expects an identifiable, reachable controller; Hayk decides what to publish (DECISIONS.md #17, #18).
- **Native read of the explanations** - all 1,050 are live and reviewed by agents, but no native speaker has read them. Start with `reports/explanations_review.html` (54 flagged questions).
- **Six questions for Hayk to judge** - the picture or official answer looks wrong in 1-48, 5-9, 6-8, 6-9, 7-107 and 7-119 (DECISIONS.md #22). They are first on the review page.
- **Medical read of the first-aid text** - the guide now separates exam answers from real-life advice (DECISIONS.md #21), but no medical professional has read it.
- **A retention period for inactive accounts** - accounts are kept until the user deletes them, and the notice says so. Deleting people's accounts automatically is Hayk's decision.
- **Bookmark a question** - needs a new synced table in the backend.
- **Finer topics in the app** - the app uses the 10 official groups (DECISIONS.md #12); sub-topics need a curated mapping of the 1,050 questions.
- **Lessons per topic** and the **exam-day guide** - parked. Open points for the guide: is driving-school training now required for B (arka.am says so, the 2024 ministry document says not for A/B/C)? The 3 psychological questions are not published anywhere found so far.
- **Report the key errors** (7-6, 7-43, 3-42) to the Road Police? Their own law says otherwise.
