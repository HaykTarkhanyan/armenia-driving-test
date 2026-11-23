// What the API does with a user's data. Every query is filtered by the verified user id.
import type { PoolClient } from 'pg'
import { STORAGE_LIMIT_BYTES, USER_LIMITS } from './config.ts'
import { withTransaction } from './db.ts'
import { HttpError } from './errors.ts'
import type { AnswerRow, ExamRow, SyncBody } from './schema.ts'

/** A token stays valid for up to 15 minutes after its account is deleted: it must not be able to bring data back. */
async function requireAccount(client: PoolClient, userId: string): Promise<void> {
  const { rowCount } = await client.query('SELECT 1 FROM neon_auth."user" WHERE id = $1::uuid', [userId])
  if (rowCount !== 1) throw new HttpError(410, 'account_deleted', 'This account has been deleted.')
}

/** One writer per user at a time: sync, reset and delete wait for each other. */
async function lockUser(client: PoolClient, userId: string): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [userId])
}

type DbAnswer = { id: string; qid: string; chosen: number; correct: boolean; at: Date; mode: 'practice' | 'exam' }
type DbExam = {
  id: string
  started_at: string
  finished_at: string
  question_ids: string[]
  orders: number[][]
  answers: (number | null)[]
  score: number
  passed: boolean
  timed_out: boolean
}

const answerRow = (r: DbAnswer): AnswerRow => ({ id: r.id, qid: r.qid, chosen: r.chosen, correct: r.correct, at: r.at.toISOString(), mode: r.mode })
const examRow = (r: DbExam): ExamRow => ({
  id: r.id,
  startedAt: Number(r.started_at),
  finishedAt: Number(r.finished_at),
  questionIds: r.question_ids,
  orders: r.orders,
  answers: r.answers,
  score: r.score,
  passed: r.passed,
  timedOut: r.timed_out,
})

const ANSWER_COLUMNS = 'id, qid, chosen, correct, at, mode'
const EXAM_COLUMNS = 'id, started_at, finished_at, question_ids, orders, answers, score, passed, timed_out'

/** Everything from one snapshot. Rows of earlier editions come separately, tagged, so the app can translate their
 * question numbers. `generation` and `resetAt` tell a device whether its local rows predate a reset. */
export async function loadState(userId: string, edition: string) {
  return withTransaction('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY', async (client) => {
    await requireAccount(client, userId)
    const answers = await client.query<DbAnswer & { edition: string }>(`SELECT edition, ${ANSWER_COLUMNS} FROM answers WHERE user_id = $1 ORDER BY at, id`, [userId])
    const exams = await client.query<DbExam & { edition: string }>(`SELECT edition, ${EXAM_COLUMNS} FROM exams WHERE user_id = $1 ORDER BY finished_at, id`, [userId])
    const state = await client.query<{ generation: number; reset_at: Date }>('SELECT generation, reset_at FROM user_state WHERE user_id = $1', [userId])
    const older = {
      answers: answers.rows.filter((r) => r.edition !== edition).map((r) => ({ ...answerRow(r), edition: r.edition })),
      exams: exams.rows.filter((r) => r.edition !== edition).map((r) => ({ ...examRow(r), edition: r.edition })),
    }
    return {
      serverTime: new Date().toISOString(),
      edition,
      generation: state.rows[0]?.generation ?? 0,
      resetAt: state.rows[0]?.reset_at.toISOString() ?? null,
      answers: answers.rows.filter((r) => r.edition === edition).map(answerRow),
      exams: exams.rows.filter((r) => r.edition === edition).map(examRow),
      older,
      otherEditionAnswers: older.answers.length,
    }
  })
}

/** One idempotent batch: a row whose id is already stored is skipped, so a retry after a timeout is always safe. */
export async function applySync(userId: string, body: SyncBody) {
  return withTransaction('BEGIN', async (client) => {
    await lockUser(client, userId) // also keeps the limit check below from being raced
    await requireAccount(client, userId)
    const state = await client.query<{ generation: number }>('SELECT generation FROM user_state WHERE user_id = $1', [userId])
    const generation = state.rows[0]?.generation ?? 0
    if ((body.generation ?? 0) !== generation) {
      throw new HttpError(409, 'progress_reset', 'This progress was reset on another device. Load the current state before uploading.')
    }
    const size = await client.query<{ bytes: string }>('SELECT pg_database_size(current_database()) AS bytes')
    if (Number(size.rows[0].bytes) > STORAGE_LIMIT_BYTES) {
      throw new HttpError(507, 'storage_full', 'The database is near its free limit, so new progress cannot be saved right now.')
    }
    let answersInserted = 0
    if (body.answers.length > 0) {
      const a = body.answers
      const res = await client.query(
        `INSERT INTO answers (user_id, edition, id, qid, chosen, correct, at, mode)
         SELECT $1, $2, * FROM unnest($3::uuid[], $4::text[], $5::smallint[], $6::boolean[], $7::timestamptz[], $8::text[])
         ON CONFLICT (user_id, id) DO NOTHING`,
        [userId, body.edition, a.map((x) => x.id), a.map((x) => x.qid), a.map((x) => x.chosen), a.map((x) => x.correct), a.map((x) => x.at), a.map((x) => x.mode)],
      )
      answersInserted = res.rowCount ?? 0
    }
    let examsInserted = 0
    for (const e of body.exams) {
      const res = await client.query(
        `INSERT INTO exams (user_id, edition, id, started_at, finished_at, question_ids, orders, answers, score, passed, timed_out)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)
         ON CONFLICT (user_id, id) DO NOTHING`,
        [userId, body.edition, e.id, e.startedAt, e.finishedAt, e.questionIds, JSON.stringify(e.orders), JSON.stringify(e.answers), e.score, e.passed, e.timedOut],
      )
      examsInserted += res.rowCount ?? 0
    }
    const counts = await client.query(
      `SELECT (SELECT count(*)::int FROM answers WHERE user_id = $1) AS answers, (SELECT count(*)::int FROM exams WHERE user_id = $1) AS exams`,
      [userId],
    )
    const { answers, exams } = counts.rows[0] as { answers: number; exams: number }
    if (answers > USER_LIMITS.answers || exams > USER_LIMITS.exams) {
      throw new HttpError(413, 'quota_exceeded', `This account has reached its limit of ${USER_LIMITS.answers} answers and ${USER_LIMITS.exams} exams.`)
    }
    return {
      ok: true,
      serverTime: new Date().toISOString(),
      answers: { received: body.answers.length, inserted: answersInserted },
      exams: { received: body.exams.length, inserted: examsInserted },
    }
  })
}

/** "Delete my account": progress and the login go together or not at all. Removing the user also removes their Google
 * link and tokens, sessions, IP addresses and device details (foreign keys ON DELETE CASCADE in neon_auth). */
export async function deleteAccount(userId: string) {
  return withTransaction('BEGIN', async (client) => {
    await lockUser(client, userId) // waits for a running sync
    await requireAccount(client, userId)
    const answers = await client.query('DELETE FROM answers WHERE user_id = $1', [userId])
    const exams = await client.query('DELETE FROM exams WHERE user_id = $1', [userId])
    await client.query('DELETE FROM user_state WHERE user_id = $1', [userId])
    await client.query('DELETE FROM api_usage WHERE user_id = $1', [userId])
    const user = await client.query('DELETE FROM neon_auth."user" WHERE id = $1::uuid', [userId])
    if (user.rowCount !== 1) throw new Error(`deleteAccount removed ${user.rowCount} users`)
    return { ok: true, answersDeleted: answers.rowCount ?? 0, examsDeleted: exams.rowCount ?? 0 }
  })
}

/** "Reset": removes all of this user's progress in every edition and starts a new generation, so that other devices
 * drop their older rows instead of uploading them back. */
export async function deleteProgress(userId: string) {
  return withTransaction('BEGIN', async (client) => {
    await lockUser(client, userId)
    await requireAccount(client, userId)
    const answers = await client.query('DELETE FROM answers WHERE user_id = $1', [userId])
    const exams = await client.query('DELETE FROM exams WHERE user_id = $1', [userId])
    const state = await client.query<{ generation: number; reset_at: Date }>(
      `INSERT INTO user_state AS s (user_id, generation, reset_at) VALUES ($1, 1, clock_timestamp())
       ON CONFLICT (user_id) DO UPDATE SET generation = s.generation + 1, reset_at = clock_timestamp()
       RETURNING generation, reset_at`,
      [userId],
    )
    return {
      ok: true,
      answersDeleted: answers.rowCount ?? 0,
      examsDeleted: exams.rowCount ?? 0,
      generation: state.rows[0].generation,
      resetAt: state.rows[0].reset_at.toISOString(),
    }
  })
}

/** A copy of everything stored about this user. Columns are listed by name so login tokens and passwords never leave. */
export async function exportAccount(userId: string) {
  return withTransaction('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY', async (client) => {
    await requireAccount(client, userId)
    const profile = await client.query('SELECT id, name, email, "emailVerified", image, "createdAt", "updatedAt" FROM neon_auth."user" WHERE id = $1::uuid', [userId])
    const logins = await client.query('SELECT "providerId", "accountId", scope, "createdAt", "updatedAt" FROM neon_auth.account WHERE "userId" = $1::uuid', [userId])
    const sessions = await client.query('SELECT "createdAt", "updatedAt", "expiresAt", "ipAddress", "userAgent" FROM neon_auth.session WHERE "userId" = $1::uuid ORDER BY "createdAt"', [userId])
    const answers = await client.query<DbAnswer & { edition: string }>(`SELECT edition, ${ANSWER_COLUMNS} FROM answers WHERE user_id = $1 ORDER BY at, id`, [userId])
    const exams = await client.query<DbExam & { edition: string }>(`SELECT edition, ${EXAM_COLUMNS} FROM exams WHERE user_id = $1 ORDER BY finished_at, id`, [userId])
    const reset = await client.query('SELECT generation, reset_at FROM user_state WHERE user_id = $1', [userId])
    const usage = await client.query(`SELECT to_char(day, 'YYYY-MM-DD') AS day, requests, windows FROM api_usage WHERE user_id = $1 ORDER BY day`, [userId])
    return {
      exportedAt: new Date().toISOString(),
      profile: profile.rows[0],
      logins: logins.rows,
      sessions: sessions.rows,
      answers: answers.rows.map((r) => ({ ...answerRow(r), edition: r.edition })),
      exams: exams.rows.map((r) => ({ ...examRow(r), edition: r.edition })),
      resets: reset.rows[0] ?? null,
      dailyUsage: usage.rows,
    }
  })
}
