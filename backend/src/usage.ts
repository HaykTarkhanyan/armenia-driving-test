// Keeps the API inside Neon's free compute quota (100 CU-hours a month at 0.25 CU). Every request wakes the database for
// at least 5 minutes, so what costs money is the number of 5-minute windows with activity, not the number of requests.
// 72 windows a day cost at most about 12 hours awake: 12 h x 0.25 CU x 31 days = 93 CU-hours.
// Reading and writing progress is limited; resetting, exporting and deleting an account never are.
import type { MiddlewareHandler } from 'hono'
import { USAGE_LIMITS } from './config.ts'
import { pool } from './db.ts'
import { HttpError } from './errors.ts'
import type { AppEnv } from './types.ts'

// Remembered per isolate, so that a client that is already over the limit does not wake the database again.
const blockedUsers = new Map<string, string>()
let everyoneBlockedOn: string | null = null
let purgedOn: string | null = null

function refuse(now: Date, who: string): never {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  throw new HttpError(429, 'rate_limited', `The daily limit for ${who} is reached. Progress stays on the device and uploads later.`, {
    retryAfterSeconds: Math.ceil((midnight - now.getTime()) / 1000),
  })
}

export const limitUsage: MiddlewareHandler<AppEnv> = async (c, next) => {
  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  const window = Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / 5)
  const userId = c.get('userId')
  if (everyoneBlockedOn === day) refuse(now, 'the app')
  if (blockedUsers.get(userId) === day) refuse(now, 'this account')

  if (purgedOn !== day) {
    purgedOn = day
    blockedUsers.clear()
    await pool.query('DELETE FROM api_usage WHERE day < $1::date - 7', [day])
    await pool.query('DELETE FROM api_usage_total WHERE day < $1::date - 7', [day])
  }
  const { rows } = await pool.query(
    `WITH total AS (
       INSERT INTO api_usage_total AS t (day, windows, last_window) VALUES ($2::date, 1, $3::int)
       ON CONFLICT (day) DO UPDATE
         SET windows = t.windows + (CASE WHEN t.last_window <> $3::int THEN 1 ELSE 0 END), last_window = $3::int
       RETURNING windows
     ), me AS (
       INSERT INTO api_usage AS u (user_id, day, requests, windows, last_window) VALUES ($1, $2::date, 1, 1, $3::int)
       ON CONFLICT (user_id, day) DO UPDATE
         SET requests = u.requests + 1,
             windows = u.windows + (CASE WHEN u.last_window <> $3::int THEN 1 ELSE 0 END),
             last_window = $3::int
       RETURNING requests, windows
     )
     SELECT total.windows AS total_windows, me.requests, me.windows FROM total, me`,
    [userId, day, window],
  )
  const usage = rows[0] as { total_windows: number; requests: number; windows: number }
  if (usage.total_windows > USAGE_LIMITS.totalWindowsPerDay) {
    everyoneBlockedOn = day
    refuse(now, 'the app')
  }
  if (usage.requests > USAGE_LIMITS.userRequestsPerDay || usage.windows > USAGE_LIMITS.userWindowsPerDay) {
    blockedUsers.set(userId, day)
    refuse(now, 'this account')
  }
  await next()
}
