# A new edition of the PDFs can renumber questions without changing them

**Symptom**

On 2026-11-23 all 20 PDFs had a new version stamp (2026-11-06). `build_dataset.py` stopped with
`abc_hy_1.pdf p1: text before the first question: '1.'`. The producer had changed from ReportLab to
`Skia/PDF m156`, with slightly different colors (green `#0b6b3a`, blue `#0f5ca8`) and font sizes (10.5, 9.5).
Group sizes changed from 145/179/129/55 to 147/181/127/53 in groups 1, 4, 7, 8.

**Cause**

The questions were reshuffled, not replaced. Compared by wording, options and perceptual picture hash:

```
before 1050, after 1050, identical 863, changed 187, removed 0, added 0
by flag: moved 185, options 1 (2-77), answer 1 (6-84)
```

**Consequences**

- A question number is only valid within one edition: old 4-81 is new 4-83. Saved progress in the app is
  therefore tied to the edition (DECISIONS.md #12).
- Different group sizes looked like new questions. They were not, so the 30-day rule for new questions
  had nothing to delay.
- Byte hashes of pictures are useless between editions: all 705 kept pictures were re-encoded.
- `data/old_pool` links to current ids, so `build_old_pool.py` must be re-run after every new edition, or
  old questions show the wrong picture.
