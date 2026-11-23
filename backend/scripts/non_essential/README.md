# backend/scripts/non_essential

| Script | What it does | When to re-run |
|---|---|---|
| `delete_check.py` | On a temporary branch with throwaway users, through the API and the real app: account deletion, durable reset, older editions, data export, daily limits, guests not contacting the sign-in service, expired sign-in. Refuses the main branch (~40 s) | After any change to accounts, sync or what is stored |
| `sync_check.py` | Two-device check in headless Chrome with the test account: guest progress moves into the account, sync both ways, exams, sign-out, reset, and API refusals (~25 s, measured) | After every backend deploy or change to the app's progress code |
