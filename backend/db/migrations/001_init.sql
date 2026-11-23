-- Study progress of signed-in users. user_id is the Neon Auth user id (the JWT "sub"); no email or name is stored here.
-- Rows are tagged with the edition of the question pool, because the same question number can mean another question in
-- a later edition (results/edition_diff_2026-11-06.json).

CREATE TABLE answers (
  user_id text        NOT NULL,
  id      uuid        NOT NULL,
  edition text        NOT NULL CHECK (edition ~ '^\d{4}-\d{2}-\d{2}$'),
  qid     text        NOT NULL CHECK (qid ~ '^(old-)?\d{1,2}-\d{1,3}$'),
  chosen  smallint    NOT NULL CHECK (chosen BETWEEN 0 AND 4),
  correct boolean     NOT NULL,
  at      timestamptz NOT NULL,
  mode    text        NOT NULL CHECK (mode IN ('practice', 'exam')),
  PRIMARY KEY (user_id, id)
);
CREATE INDEX answers_user_edition_at ON answers (user_id, edition, at);

CREATE TABLE exams (
  user_id      text     NOT NULL,
  id           uuid     NOT NULL,
  edition      text     NOT NULL CHECK (edition ~ '^\d{4}-\d{2}-\d{2}$'),
  started_at   bigint   NOT NULL CHECK (started_at >= 0),
  finished_at  bigint   NOT NULL CHECK (finished_at >= started_at),
  question_ids text[]   NOT NULL CHECK (cardinality(question_ids) = 20),
  orders       jsonb    NOT NULL,
  answers      jsonb    NOT NULL,
  score        smallint NOT NULL CHECK (score BETWEEN 0 AND 20),
  passed       boolean  NOT NULL,
  timed_out    boolean  NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX exams_user_edition_finished ON exams (user_id, edition, finished_at);
