# roadpolice.am does not send its intermediate certificate

**Symptom**

```
$ curl -sS -o x.pdf https://www.roadpolice.am/exam/abc/en/1.pdf
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

Same with `--ssl-no-revoke`. Python's `urllib` fails the same way.

**Cause**

The server sends only its own certificate, not the intermediate. Browsers and Windows' certificate
verifier fetch the missing intermediate from the URL inside the certificate (AIA); Git Bash's
OpenSSL-based curl and Python's bundled CA handling do not.

**What works (verification stays on)**

- `C:\Windows\System32\curl.exe` (Schannel): `200 15087890`.
- Python: `truststore.inject_into_ssl()` (truststore 0.10.5) before any request; verifies through
  Windows. Used in `scripts/download_pdfs.py`.

Never "fix" this with `-k` / `verify=False`.
