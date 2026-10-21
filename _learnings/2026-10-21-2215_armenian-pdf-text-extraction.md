# pdftotext garbles the Armenian PDFs; pypdf and PyMuPDF read them fine

**Symptom**

`pdftotext -layout abc_hy_1.pdf -` prints junk (`ABC  ` followed by bytes 0o267, 0o253, 0o273)
and warns `No display font for 'ArialUnicode'`. The rendered page looks perfect.

**Cause**

`pdffonts` lists the Segoe UI subsets with `WinAnsi` encoding; poppler decodes through that
single-byte encoding. The fonts' ToUnicode maps are correct, and the libraries that use them get
clean text:

```
pypdf    : 'ԽՈՒՄԲ 1\nABC կարգեր · տեսական հարցաշար\n145 հարց\n1. Նշաններից ո՞րն է կոչվում ...'
PyMuPDF  : same text, plus position, font size and color per line
```

**Consequences**

No OCR needed. The English PDFs extract fine with every tool, which makes a misleading first test
if only English is tried.

Also: PyMuPDF 2.0 (current on 2026-10-21) pulls in onnxruntime, numpy and networkx; 1.28.2 does the
same `get_text("dict")` job with no dependencies (DECISIONS.md #3).
