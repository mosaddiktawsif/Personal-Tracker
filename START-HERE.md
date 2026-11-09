# START HERE

One page, in order. If you only read one file after a break, read this one.
`README.md` explains the project; `ROADMAP.md` is the 7-week plan; this is
**what to type next**.

Verified on this machine, 2026-11-09.

---

## Where you already are

Do not reinstall any of this.

| Thing | Status | Check it with |
|---|---|---|
| Node.js | v24.11.0 (`.nvmrc` wants 24) | `node -v` |
| npm | 11.6.1 | `npm -v` |
| Git identity | `mosaddiktawsif <mosaddik.tawsif@gmail.com>` | `git config user.email` |
| Repo | initialised on `main`, 7 commits | `git log --oneline` |
| Dependencies | installed (`node_modules/` present) | `ls node_modules > /dev/null && echo ok` |
| Postgres | installed locally, **not running right now** | `netstat -ano \| grep ':5432 '` |
| Docker | **not installed** — not needed until Week 5 | `docker -v` |
| GitHub remote | connected and pushed: `mosaddiktawsif/Personal-Tracker` | `git status -sb` → `## main...origin/main` |

---

## Step 1 — GitHub: done (2026-11-09)

Nothing to do here. The repo is connected and pushed:

```
origin  https://github.com/mosaddiktawsif/Personal-Tracker.git
main    tracks origin/main, in sync, working tree clean
```

Confirm any time with `git status -sb`. It should print `## main...origin/main`
with **no** `ahead`/`behind` and no `untracked` lines. If it says `ahead 1`,
you have a commit that is only on this laptop — `git push` fixes it.

Already verified for you: `.env` is ignored by git and was never pushed, and
neither was `.local/` (your database files) or `node_modules/`.

From now on the loop is just: change a file → `git add <file>` →
`git commit -m "what changed and why"` → `git push`.

---

## Step 2 — Start the database (every session, ~1 min)

Postgres does not survive a reboot, and right now it is stopped. From the
project root:

```bash
PG=.local/pg/node_modules/@embedded-postgres/windows-x64/native/bin
$PG/pg_ctl.exe -D .local/pgdata -l .local/pg.log -o "-p 5432" -w start
```

Do **not** pipe that command into `grep` or `tail` — the server inherits the
pipe and the command hangs. That is documented in `README.md` too.

Confirm it worked:

```bash
npm run db:sql -- "SELECT 1 AS one"
```

Expected: a small table with `1` in it. If you instead get
`ECONNREFUSED 127.0.0.1:5432`, the server is not running — the start line above
is the fix, and no re-init is ever needed.

---

## Step 3 — The two numbers that tell you the truth (every session)

```bash
npm test
npm run check:week1
```

| Command | Right now | Means |
|---|---|---|
| `npm test` | **5 passed** | The app, routes and database wiring work |
| `npm run check:week1` | **1/9 passed, exits 1** | Your schema does not exist yet — expected until Week 1 |

`check:week1` exiting 1 is not an error. It is the scoreboard, and it is the
one thing in this repo that will tell you whether you are behind without you
having to guess.

---

## Step 4 — Run the app while you work

```bash
npm run dev
```

Then in a second terminal:

```bash
curl http://127.0.0.1:3000/health     # app is up, no database involved
curl http://127.0.0.1:3000/db/check   # proves a real query ran
```

`/health` returning 200 while `/db/check` returns 503 means the app is fine and
the database is down — that separation is deliberate.

Use `npm start` only when you want to check the *built* output; it runs the build
first. Do not run it while `npm run dev` is already on port 3000: change `PORT`
in `.env`, or stop one of them.

---

## Step 5 — What to do, by date

This is Week 0 of `ROADMAP.md`, with two exam days removed.

### Nov 9 (today) — done

- [x] Audit answered in `week0-audit.md`, scored **2/21** (see the marked column)

### Nov 10 — exam

Nothing. Do not open the repo.

### Nov 11–15 — finish Week 0

Week 0's done-when is **a public URL returning `{"status":"ok"}`**, plus a
commit. Two sessions of work:

1. [ ] Read MDN "Overview of HTTP" once (~20 min). No notes, no other articles.
2. [ ] Deploy this service to a host and put the URL in `README.md`. The steps
       are the same on any host: build command `npm run build`, start command
       `npm start`, environment variable `DATABASE_URL`, and the health check
       path `/health`. You will need a hosted database too — the local
       `.local/pgdata` cannot be reached from the internet.
3. [ ] `git push` and confirm the URL is in the repository.

If deployment fights you for more than two hours, stop and note it: Week 5 is
where deploy becomes a graded skill, and shipping it now is a bonus, not a gate.

### Nov 16 — exam

Nothing.

### Nov 17–22 — Week 1 (SQL and schema)

1. [ ] Rename `db/migrations/002_domain_schema.sql.todo` to `.sql` and model
       6–10 tables: PKs, FKs, `NOT NULL`, unique constraints, `CHECK`s.
2. [ ] `npm run db:migrate` after each edit; `npm run check:week1` after each
       migrate, until it reports **9/9**.
3. [ ] Add seeders to `db/seed.ts` so you have 10k rows.
4. [ ] Record 5 measured queries in `queries.md` — `npm run db:sql -- "EXPLAIN
       ANALYZE ..."` before and after adding an index.

Read: the PostgreSQL tutorial and use-the-index-luke.com. Nothing else. That
list is the whole allowed reading in `ROADMAP.md`.

### Nov 23 → Dec 31

Weeks 2–7 are in `ROADMAP.md`, one artifact each. Do not open a second guide.

---

## Step 6 — What to install, and when

| When | What | Why |
|---|---|---|
| Now | **Nothing** | Node, npm, Git and Postgres are working |
| Before Nov 17 | Nothing new | Week 1 needs only `npm run db:sql` |
| Before Dec 14 (Week 5) | Docker Desktop (WSL2 backend) | Week 5 is containers, CI, deploy |
| Optional, now | GitHub CLI (`gh`) | Only saves mouse clicks |

Do not install Redis, an ORM, a queue, or a test framework you read about. Week
4 covers caching and jobs; the point is to feel the problem first.

---

## Step 7 — When something breaks

`README.md` → **Troubleshooting** lists the messages this project deliberately
produces, and the fix for each. The three you will actually hit:

| Message | Fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | Step 2 above |
| `EADDRINUSE: 3000` | Something already owns the port — change `PORT` in `.env` |
| `check:week1` exits 1 | Expected until Week 1's schema is done; read its list top to bottom |

---

## The one rule

You do not lose track from missing a day. You lose track by deciding, on the
day you come back, that the plan is now invalid and a different guide would
have been better.

The plan is `ROADMAP.md`. The scoreboard is `npm run check:week1`. Nothing
else on the internet is part of this until December 31.
