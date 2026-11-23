# Backend: Neon Auth + Functions API + Postgres

Saves the study progress of signed-in users, so the phone and the PC share it. Same stack as the nemeceren app, in its
own Neon project. **Neon stays on the Free plan. Never upgrade, add billing, or enable paid features.**

```
GitHub Pages app  --sign in with Google-->  Neon Auth (Managed Better Auth)
        |                                       |
        |  Authorization: Bearer <JWT>          | JWKS (public keys)
        v                                       v
Neon Function "api" (Hono, src/)  -- verifies the JWT, scopes every query by user id
        |
        v
Postgres (tables in db/migrations/)
```

- Project `armenia-driving-test` (`noisy-smoke-18644029`), region `aws-eu-central-1`, branch `main`. The gitignored repo-root `.neon` links it.
- API: `https://br-green-bird-bh8yxv3r-api.compute.c-10.eu-central-1.aws.neon.tech`
- Auth: `https://ep-rough-truth-bhrc5p77.neonauth.c-10.eu-central-1.aws.neon.tech/neondb/auth`
- Both addresses are public (`app/src/lib/config.ts`). Connection strings and the test login live only in the gitignored `.env.local`.
- Tables hold the Neon Auth user id, never an email or name. Those stay in Neon Auth's own `neon_auth` schema.

## API

| Route | Auth | What |
|---|---|---|
| `GET /v1/health` | no | Does not touch the database |
| `GET /v1/state?edition=2026-11-06` | yes | This user's answers and exams for that edition, rows of earlier editions under `older` (the app translates their question numbers), and the reset `generation` |
| `POST /v1/sync` | yes | `{ edition, generation, answers: [...], exams: [...] }`, at most 500 answers and 20 exams. Idempotent: a stored id is skipped, so retries are safe. A device behind on resets gets 409 `progress_reset` |
| `DELETE /v1/progress` | yes | Removes all of this user's progress and starts a new generation, so other devices cannot upload their old rows back |
| `DELETE /v1/account` | yes | Removes this user's progress and login in one transaction (Google link and tokens, sessions, IP addresses). A token of a deleted account gets 410 `account_deleted` |
| `GET /v1/export` | yes | A copy of everything stored about this user, without login tokens or passwords |

Only `https://hayktarkhanyan.github.io` and localhost ports 5175 and 4179 may call it from a browser. Each account may
keep 30,000 answers and 300 exams (`src/config.ts`), because anyone with a Google account can sign up.

Reading and writing progress is limited per day (`src/usage.ts`): 1,500 requests and 36 active 5-minute windows per account,
72 windows for everybody together, which keeps compute under about 93 of the 100 free CU-hours a month. New writes stop at a
400 MB database. When a limit is hit, progress stays on the device and uploads later; reset, export and delete always work.
Not covered: requests sent directly to Neon Auth, which this API cannot see.

## Who can sign in

- **Google:** anyone. It currently uses Neon's shared Google credentials, so Google's screen shows Neon's name. To show the app's name, create a Google OAuth client (Web application) with the redirect URI `<Auth URL>/callback/google`, publish its consent screen, then run `neon neon-auth oauth-provider update --provider-id google --oauth-client-id <id> --oauth-client-secret <secret>`.
- **Password:** sign-up is closed. The only password account is Claude's test account (`claude-test@example.com`), used by the sync check.

## Free-plan rules the app follows

The app loads the state once on start and uploads in batches: 20 s after a change, right after an exam, and when the tab
is hidden. It never polls and never sends an empty batch, so an idle tab lets the database sleep (Free: 100 CU-hours a
month at 0.25 CU, and it wakes for at least 5 minutes per use).

## Deploy and operate

From `backend/` unless noted. Measured 2026-11-23: install 6 s, deploy under 30 s, migration 0.3 s.

```bash
npm install
npm run typecheck
neon config plan                     # read it; stop if it removes or changes anything unexpected
neon deploy --no-env-pull
neon env pull --file ../.env.local   # writes to the one gitignored .env.local
neon logs query --source function --since 1h

# from the repo root
uv run backend/scripts/migrate.py status
uv run backend/scripts/migrate.py apply
uv run backend/scripts/non_essential/sync_check.py --base https://hayktarkhanyan.github.io/armenia-driving-test/   # ~25 s
```

To test account deletion, never use `main`: create a temporary branch (`neon branches create --name delete-test --expires-at <time>`), deploy to it, open password sign-up on it only, build the app with its `VITE_AUTH_URL` and `VITE_API_URL`, and run `delete_check.py --env <branch env file>`. Delete the branch afterwards.

Never edit an applied migration; add a new `NNN_*.sql`. When the app's answer or exam shape changes, update `src/schema.ts` too.
