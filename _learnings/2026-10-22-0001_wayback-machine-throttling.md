# The Wayback Machine refuses connections for minutes after a burst

**Symptom**

After a few CDX queries and page fetches in a row, `web.archive.org` answered with
`HTTP Error 503`, then `[WinError 10061] ... actively refused it`, `[WinError 10054] forcibly
closed` and `[WinError 10060] ... failed to respond`, for 5-15 minutes at a time. A plain
`curl https://web.archive.org/` sometimes still returned 200 while downloads were refused.

**What worked**

`scripts/download_old_pool.py` retries 503/429 and refused or reset connections with growing
waits (30, 60, 90, 120 s), waits 15 s between files and skips files already in its manifest with a
matching SHA-256. Run in a loop of up to 8 attempts 5 minutes apart, the 20 PDFs (41.2 MB) arrived on
attempt 3, about 30 minutes after the first try.

**Consequences**

Never fire several archive.org requests back to back; probe once, then download slowly and
resumably. The CDX API with wildcards (`url=.../exam/*`) is the first thing to get a 503.
