# backend/scripts/non_essential

| Script | What it does | When to re-run |
|---|---|---|
| `sync_check.py` | Two-device check in headless Chrome with the test account: guest progress moves into the account, sync both ways, exams, sign-out, reset, and API refusals (~25 s, measured) | After every backend deploy or change to the app's progress code |
