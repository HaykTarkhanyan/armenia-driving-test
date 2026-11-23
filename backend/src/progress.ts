// The three things the API does with a user's progress. Every query is filtered by the verified user id.
import { USER_LIMITS } from './config.ts'
import { withTransaction } from './db.ts'
import { HttpError } from './errors.ts'
import type { AnswerRow, ExamRow, SyncBody } from './schema.ts'
import type { PoolClient } from 'pg'

/** A token stays valid for up to 15 minutes after its account is deleted: it must not be able to bring data back. */
async function requireAccount(client: PoolClient, userId: string): Promise<void> {
  const { rowCount } = await client.query('SELECT 1 FROM neon_auth."user" WHERE id = $1::uuid', [userId])
  if (rowCount !== 1) throw new HttpError(410, 'account_deleted', 'This account has been deleted.')
}

/** Everything for one edition, from one snapshot, plus how many answers belong to other editions. */
export async function loadState(userId: string, edition: string) {
  return withTransaction('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY', async (client) => {
    await requireAccount(client, userId)
    const answers = await client.query(
      `SELECT id, qid, chosen, correct, at, mode FROM answers WHERE user_id = $1 AND edition = $2 ORDER BY at, id`,
      [userId, edition],
    )
    const exams = await client.query(
      `SELECT id, started_at, finished_at, question_ids, orders, answers, score, passed, timed_out
         FROM exams WHERE user_id = $1 AND edition = $2 ORDER BY finished_at, id`,
      [userId, edition],
    )
    const other = await client.query(`SELECT count(*)::int AS n FROM answers WHERE user_id = $1 AND edition <> $2`, [userId, edition])
    return {
      serverTime: new Date().toISOString(),
      edition,
      answers: answers.rows.map(
        (r): AnswerRow => ({ id: r.id, qid: r.qid, chosen: r.chosen, correct: r.correct, at: (r.at as Date).toISOString(), mode: r.mode }),
      ),
      exams: exams.rows.map(
        (r): ExamRow => ({
          id: r.id,
          startedAt: Number(r.started_at),
          finishedAt: Number(r.finished_at),
          questionIds: r.question_ids,
          orders: r.orders,
          answers: r.answers,
          score: r.score,
          passed: r.passed,
          timedOut: r.timed_out,
        }),
      ),
      otherEditionAnswers: other.rows[0].n as number,
    }
  })
}

/** One idempotent batch: a row whose id is already stored is skipped, so a retry after a timeout is always safe. */
export async function applySync(userId: string, body: SyncBody) {
  return withTransaction('BEGIN', async (client) => {
    // One sync per user at a time, so the limit check below cannot be raced.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [userId])
    await requireAccount(client, userId)
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
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [userId]) // waits for a running sync
    await requireAccount(client, userId)
    const answers = await client.query('DELETE FROM answers WHERE user_id = $1', [userId])
    const exams = await client.query('DELETE FROM exams WHERE user_id = $1', [userId])
    const user = await client.query('DELETE FROM neon_auth."user" WHERE id = $1::uuid', [userId])
    if (user.rowCount !== 1) throw new Error(`deleteAccount removed ${user.rowCount} users`)
    return { ok: true, answersDeleted: answers.rowCount ?? 0, examsDeleted: exams.rowCount ?? 0 }
  })
}

/** "Reset" in the app: removes all of this user's progress, in every edition. */
export async function deleteProgress(userId: string) {
  return withTransaction('BEGIN', async (client) => {
    await requireAccount(client, userId)
    const answers = await client.query('DELETE FROM answers WHERE user_id = $1', [userId])
    const exams = await client.query('DELETE FROM exams WHERE user_id = $1', [userId])
    return { ok: true, answersDeleted: answers.rowCount ?? 0, examsDeleted: exams.rowCount ?? 0 }
  })
}
