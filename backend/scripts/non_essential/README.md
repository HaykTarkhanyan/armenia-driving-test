# backend/scripts/non_essential

| Script | What it does | When to re-run |
|---|---|---|
| `delete_check.py` | Tests "Delete my account" on a temporary branch with throwaway users, through the API and the real button; refuses the main branch (~20 s, measured) | After any change to account deletion or to what is stored |
| `sync_check.py` | Two-device check in headless Chrome with the test account: guest progress moves into the account, sync both ways, exams, sign-out, reset, and API refusals (~25 s, measured) | After every backend deploy or change to the app's progress code |
