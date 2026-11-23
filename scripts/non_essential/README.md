# scripts/non_essential

Maintained tools that are not needed to rebuild the dataset or the report.

| Script | What it does | When to re-run |
|---|---|---|
| `make_icons.py` | Draws the app's home-screen icons into `app/public/icons/` (~1 s) | When the icon should change |
| `new_edition.py` | Registers a new edition in `data/edition.json` with the migration of question numbers; does nothing if the questions did not change (~1 s) | After `diff_editions.py`, whenever the questions changed |
| `diff_editions.py` | Compares two editions of the pool by wording, options and picture content; writes `results/edition_diff_<date>.json` (~20 s, measured) | After `download_pdfs.py` and `build_dataset.py` find a new edition on roadpolice.am |
