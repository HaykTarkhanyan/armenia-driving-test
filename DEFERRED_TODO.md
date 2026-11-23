# Deferred TODO

Parked ideas, not started.

- **D/T category set** (buses, tractors) - same site, same layout; only if someone needs it (DECISIONS.md #2).
- **Russian / English in the app** - the parser already reads those PDFs; only if someone else uses the app.
- **Cross-check against a third-party app** (drv.am, varord.am) - would show whether they track the 2026-10-02 pool; our answers already agree between the Armenian and English official PDFs.
- **Watch for a new pool** - re-run `scripts/download_pdfs.py`; it re-downloads only groups whose version stamp changed, then rebuild.
- **Own Google OAuth client** - sign-in uses Neon's shared credentials, so Google's screen shows Neon's name. Steps are in `backend/README.md`.
- **"Delete my account" button** - "Reset" removes a user's progress, but their Google email stays in Neon Auth until removed by hand.
- **Bookmark a question** - needs a new synced table in the backend.
- **Finer topics in the app** - the app uses the 10 official groups (DECISIONS.md #12); sub-topics need a curated mapping of the 1,050 questions.
- **Progress migration for the next edition** - saved progress is refused when the edition changes (DECISIONS.md #12). Before deploying a new edition, map the ids from `results/edition_diff_<date>.json`.
- **Lessons per topic** and the **exam-day guide** - parked. Open points for the guide: is driving-school training now required for B (arka.am says so, the 2024 ministry document says not for A/B/C)? The 3 psychological questions are not published anywhere found so far.
- **Report the key errors** (7-6, 7-43, 3-42) to the Road Police? Their own law says otherwise.
