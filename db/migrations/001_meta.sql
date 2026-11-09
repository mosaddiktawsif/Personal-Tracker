-- 001_meta.sql
--
-- Infrastructure, not your domain model.
--
-- `schema_migrations` is created by db/migrate.ts. This file adds a tiny key/value
-- table so that /db/check and the end-to-end test have a real application table to
-- read — proving the wiring works, not just the socket.
--
-- TODO (Week 1): do NOT put your domain tables here. Create a new file named
--                002_<something>.sql for your schema. See ROADMAP.md -> Week 1.

CREATE TABLE IF NOT EXISTS app_meta (
  key        text        PRIMARY KEY,
  value      text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_meta (key, value)
VALUES ('skeleton_version', '1')
ON CONFLICT (key) DO NOTHING;
