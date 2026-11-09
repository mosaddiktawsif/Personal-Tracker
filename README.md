# backend-week1

Week 1 skeleton for the [7-week backend roadmap](./ROADMAP.md).

It gives you the boring, easy-to-get-wrong parts — an HTTP server, a Postgres
connection, a migration runner, tests that prove both work — so that your Week 1
attention goes where it belongs: **designing your own schema.**

What it deliberately does **not** give you: a domain schema, real endpoints, or
auth. Those are Weeks 1–3, and they are yours to build.

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node | 20+ (24 verified) | `node -v` |
| npm | 10+ | `npm -v` |
| Docker Desktop | any recent | `docker compose version` |

Windows/macOS both work. Commands below are bash (Git Bash, macOS, Linux);
PowerShell equivalents are in [Windows notes](#windows-notes).

---

## Quick start — clone to a passing test run

```bash
# 1. get the code
cd /h/Local                 # this project on Windows (Git Bash); or: git clone <url> && cd <name>

# 2. install dependencies
npm install

# 3. create your local config (never committed)
cp .env.example .env

# 4. start Postgres
docker compose up -d

# 5. wait until it reports "healthy" — this matters, Postgres takes a few seconds
docker compose ps

# 6. create the tables
npm run db:migrate

# 7. seed your domain tables (prints guidance until you have a schema)
npm run db:seed

# 8. prove the app works
npm test

# 9. see how far Week 1 is from done
npm run check:week1
```

Step 8 should end with something like:

```
✓ test/health.test.ts (3 tests)
✓ test/db.test.ts (2 tests)
Test Files  2 passed (2)
     Tests  5 passed (5)
```

Step 9 is a checklist, not a test. On a fresh checkout it **exits 1 and reports
seven failures**, because your schema doesn't exist yet — that is the correct
result on day one. Everything it lists is your Week 1 to-do list, in order.

Then run the server and look at it yourself:

```bash
npm run dev
# in a second terminal:
curl http://127.0.0.1:3000/health
# {"status":"ok","uptime":1.234,"timestamp":"2026-11-09T..."}
curl http://127.0.0.1:3000/db/check
# {"status":"ok","serverTime":"...","migrations":1,"skeletonVersion":"1"}
```

`npm run db:migrate` a second time is safe — it prints `skip` for anything
already applied.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with reload on file change (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Build, then run the compiled server (`prestart` builds for you) |
| `npm run typecheck` | Strict type check, no output files |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests on change |
| `npm run db:migrate` | Apply pending `db/migrations/*.sql` |
| `npm run db:seed` | Run the seeders in `db/seed.ts` (`-- --rows=N`, default 10000) |
| `npm run db:sql -- "..."` | Run one statement and print the result — this is how you get `EXPLAIN` output |
| `npm run check:week1` | Grade your schema against the Week 1 checklist (read-only; exits 1 until it passes) |

> `.env` overrides your shell environment locally, so change `PORT` there rather
> than exporting it. In production there is no `.env`, and the platform's
> injected `PORT` is what the server binds.

---

## Layout

```
src/
  config.ts      env loading + validation — fails fast, in one place
  db.ts          connection pool, and error messages that tell you what to fix
  app.ts         routes; /health (no DB) and /db/check (DB)
  server.ts      listen + graceful shutdown
db/
  migrate.ts     forward-only SQL migration runner, ~90 lines
  seed.ts        your seeders go here (registry starts empty, on purpose)
  sql.ts         run one statement from the terminal — needed for EXPLAIN
  migrations/    001_meta.sql (infrastructure), 002_domain_schema.sql.todo (yours)
scripts/
  check-week1.ts grades your schema against the Week 1 checklist
test/
  helpers.ts     boots the real server on a random port
  health.test.ts liveness, and JSON 404s
  db.test.ts     end-to-end proof the database wiring works
week0-audit.md   fill this in before Week 1
queries.md       your 5 measured queries — the Week 1 artifact
ROADMAP.md       the 7-week plan
```

### Why `/health` and `/db/check` are separate

`/health` answers without touching Postgres. If liveness needed the database, a
database outage would look identical to a dead process, and your orchestrator
would restart a perfectly healthy app.

`/db/check` returns `503` with a plain-English explanation when the database is
unreachable or unmigrated. The tests hit both, so a green suite means more than
"a port opened".

---

## Do these next

**1. Fill in `week0-audit.md`** — 20 minutes, no searching. It tells you which of
Weeks 1–3 need extra hours and which reading you can skip. Scoring guidance is
inside the file.

**2. Design your Week 1 schema.** Open `db/migrations/002_domain_schema.sql.todo`,
then:

```bash
git mv db/migrations/002_domain_schema.sql.todo db/migrations/002_domain_schema.sql
```

...and start typing SQL. Pick a domain with real rules — bookings, invoices,
inventory, a clinic, a small marketplace. Requirements are listed at the top of
that file and in [ROADMAP.md](./ROADMAP.md) under Week 1.

Do not look for a schema to copy. Designing the constraints *is* the exercise.

**3. Seed it, then measure it.** Once your tables exist, add a seeder per table
in `db/seed.ts` (the file shows the shape), then:

```bash
npm run db:seed                              # 10k rows by default
npm run db:sql -- "EXPLAIN ANALYZE SELECT ..."
npm run check:week1
```

Record what you measured in `queries.md` — five queries, each with the plan
before and after an index, and the timings. That file is the Week 1 artifact.
`check:week1` stays red until the schema holds up; `queries.md` stays empty until
you have real numbers.

---

## No Docker yet?

Docker Desktop needs a (free) install and, on Windows, the WSL2 backend. Install
it when you can — Week 5 is about Docker, so it is not optional long-term.

If you want to start today, you can run a portable Postgres with no admin
rights. **This fallback is Windows-only** (it uses `.exe` binaries and the
`@embedded-postgres/windows-x64` package); on macOS/Linux, install Docker or use
your distro's `postgresql` package instead.

```bash
npm install --prefix .local/pg @embedded-postgres/windows-x64@17.11.0-beta.19
PG=.local/pg/node_modules/@embedded-postgres/windows-x64/native/bin
printf 'app' > .local/pw
$PG/initdb.exe -D .local/pgdata -U app -A scram-sha-256 --pwfile=.local/pw -E UTF8 --locale=C
$PG/pg_ctl.exe -D .local/pgdata -l .local/pg.log -o "-p 5432" -w start
# then create the empty database (the compose file does this for you):
node -e "const{Client}=require('pg');(async()=>{const c=new Client({host:'127.0.0.1',user:'app',password:'app',database:'postgres'});await c.connect();await c.query('CREATE DATABASE backend_dev').catch(()=>{});await c.end();console.log('ok')})()"
```

Stop it later with `$PG/pg_ctl.exe -D .local/pgdata stop`. `.local/` is gitignored,
so this is a local convenience, not part of the project.

This server does **not** survive a reboot, so the start line is the one you will
run every morning. If you see `ECONNREFUSED 127.0.0.1:5432`, or two tests fail
while the `/health` ones pass, it simply is not running yet — from the project
root:

```bash
PG=.local/pg/node_modules/@embedded-postgres/windows-x64/native/bin
$PG/pg_ctl.exe -D .local/pgdata -l .local/pg.log -o "-p 5432" -w start
```

You do not need to re-run `initdb` or `CREATE DATABASE`; the data directory and
`backend_dev` are still there.

> Note: run `pg_ctl` **without piping its output** (`| tail`, `| grep`). On
> Windows the detached Postgres server inherits the pipe handle, so the pipe
> never closes and your command appears to hang.

---

## Troubleshooting

The errors below are the ones `src/db.ts` and `db/migrate.ts` are written to
produce. They name the fix on purpose.

| Message | Cause | Fix |
|---|---|---|
| `Missing required environment variable DATABASE_URL` | No `.env` | `cp .env.example .env` |
| `Postgres is not accepting connections at 127.0.0.1:5432` | Postgres isn't running | `docker compose up -d`, or on the no-Docker path the `pg_ctl` start line in [No Docker yet?](#no-docker-yet) |
| `connect ECONNREFUSED 127.0.0.1:5432` (in tests or `db:sql`) | Postgres stopped — it does not survive a reboot | Same start line in [No Docker yet?](#no-docker-yet); no re-init needed |
| `Postgres rejected the credentials` | `.env` doesn't match compose | Both should be user `app`, password `app` |
| `It has not been migrated yet` | Database is empty | `npm run db:migrate` |
| `EADDRINUSE: 3000` | Something else owns the port | Change `PORT` in `.env` (e.g. 3001) |
| `docker: command not found` | Docker Desktop not installed | See [No Docker yet?](#no-docker-yet) |
| `[seed] no domain tables yet` | You haven't written a schema yet | Expected on day one — see [Do these next](#do-these-next) |
| `check:week1` exits 1 | The Week 1 checklist isn't complete | Read its list top to bottom; that _is_ the feature |
| `Cannot find module 'dist/src/server.js'` | Ran the build output without building | `npm start` builds for you now; or `npm run build` first |

---

## Windows notes

- Use **Git Bash** for the commands above (`cp`, `curl`, `$VAR` all work there).
- **PowerShell** equivalents: `Copy-Item .env.example .env` instead of `cp`, and
  `curl.exe` (not the `curl` alias) if you want the real curl.
- Docker Desktop requires the WSL2 backend; enable it if `docker compose up`
  reports a virtualisation error.
- `.env` is already in `.gitignore`. Verify with `git check-ignore -v .env`
  before you commit anything.
