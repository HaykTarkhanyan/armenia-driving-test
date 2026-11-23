-- user_state: counts each "Reset", so a device that still holds older rows cannot upload them back.
-- api_usage / api_usage_total: daily counters that keep one account, or everybody together, inside the free compute
-- quota. A "window" is a 5-minute slot with at least one request. Rows are removed after 7 days.

CREATE TABLE user_state (
  user_id    text        PRIMARY KEY,
  generation integer     NOT NULL CHECK (generation >= 0),
  reset_at   timestamptz NOT NULL
);

CREATE TABLE api_usage (
  user_id     text    NOT NULL,
  day         date    NOT NULL,
  requests    integer NOT NULL CHECK (requests >= 0),
  windows     integer NOT NULL CHECK (windows >= 0),
  last_window integer NOT NULL,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE api_usage_total (
  day         date    PRIMARY KEY,
  windows     integer NOT NULL CHECK (windows >= 0),
  last_window integer NOT NULL
);
