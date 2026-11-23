# scripts/non_essential

Maintained tools that are not needed to rebuild the dataset or the report.

| Script | What it does | When to re-run |
|---|---|---|
| `diff_editions.py` | Compares two editions of the pool by wording, options and picture content; writes `results/edition_diff_<date>.json` (~20 s, measured) | After `download_pdfs.py` and `build_dataset.py` find a new edition on roadpolice.am |
