# Backend Developer — 7-Week Mission (Nov 9 → Dec 31, 2026)

You start at ~50–60% understanding. By Dec 31 the realistic target is:

> **One deployed, tested, documented backend that does hard things (multi-tenancy, auth, jobs, webhooks), plus the ability to explain every decision in it out loud for 20 minutes without notes.**

That is what gets a junior backend hire. "Great" is a 2–3 year project; becoming *credible* is a 7-week one.

---

## The one rule that fixes losing your track

> **You are not allowed to start a new course, book, or tutorial until the current week's artifact is deployed and its checklist is ticked.**

Drift doesn't come from laziness. It comes from the feeling of "maybe the *other* resource explains it better." Every switch resets you to zero. One resource per topic, chosen below, is enough.

Corollary rules:

1. **One stack, locked for 7 weeks.** Swapping languages mid-plan is the #1 way people restart forever.
2. **45-minute stuck rule.** Stuck longer than 45 min → write the question in `#questions` below, move on, come back tomorrow with fresh eyes or ask.
3. **Commit every day you work**, even if it's a 3-line commit. The green squares are your accountability.
4. **Sunday 30-min review.** Update the progress table, tick boxes, plan next week. No code that day if you don't want to.
5. **No tutorial without shipping.** Watch/read → immediately write the thing yourself with the tab closed.

---

## Locked stack

> **Assumption: TypeScript + Node (Fastify or Express) + PostgreSQL.**
> This is the default below. If you'd rather use **Python/FastAPI**, **Go**, or **Java/Spring**, say so and the tooling references get rewritten — the seven weeks, projects, and checkpoints stay identical, because they're about backend concepts, not syntax.

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Types catch the bugs juniors ship; huge hiring pool |
| Framework | Fastify (or Express) | Boring, documented, no magic |
| Database | PostgreSQL | The default backend DB; teaches real SQL |
| Cache/queue | Redis + BullMQ | One tool for caching *and* jobs |
| Tests | Vitest + supertest | Fast, no ceremony |
| Ops | Docker + Docker Compose | Non-negotiable in 2026 |
| CI/deploy | GitHub Actions + Railway/Fly.io | Free tier, real deploys |

---

## The seven weeks

Local Postgres and Redis from day one: `docker compose up -d`. Never develop against SQLite and hope.

| Week | Dates | Theme | Artifact you ship |
|---|---|---|---|
| 0 | Nov 9–15 | Audit + foundations + first deploy | Trivial live API with 1 table |
| 1 | Nov 16–22 | SQL, schema design, migrations | Real schema + seed + queries |
| 2 | Nov 23–29 | HTTP API design done properly | Full CRUD API, validated, paginated |
| 3 | Nov 30–Dec 6 | Auth, sessions, security | API with real auth + RBAC |
| 4 | Dec 7–13 | Testing, jobs, caching, failure | Tested API + background worker |
| 5 | Dec 14–20 | Docker, CI, deploy, load test | Deployed + measured + fixed |
| 6 | Dec 21–27 | Hard parts + design doc | Webhooks, idempotency, architecture doc |
| 7 | Dec 28–31 | Interview mode | Explain it cold + start applying |

---

## Week 0 — Audit & first deploy (Nov 9–15)

**Goal:** kill impostor-syndrome-by-guessing. Find out precisely what you don't know.

**Audit — answer these in writing, no searching:**
- [ ] Difference between 200, 201, 204, 400, 401, 403, 404, 409, 422, 500 — and when you'd return each
- [ ] What a database transaction guarantees (ACID in your own words)
- [ ] Why an index makes a query fast, and what it costs
- [ ] What happens between a browser sending a request and your handler running
- [ ] Difference between authentication and authorization
- [ ] What a race condition is, with a backend example (double-spend, double-book)
- [ ] What a migration is and why you can't just edit the table by hand

Anything you fumble → that's your Week 1–3 focus, not a reason to panic.

**Build:** a service with `GET /health` and `GET /db/check` that queries Postgres, deployed to Railway or Fly.io, with the URL in the README.

**Learn:** MDN "Overview of HTTP" + your framework's official getting-started. Nothing else.

**Done when:** a public URL returns `{"status":"ok"}` and a commit exists.

---

## Week 1 — SQL & data modeling (Nov 16–22)

The highest-leverage skill on this list. Weak SQL is the most common junior backend gap.

- [ ] Model a realistic domain in 6–10 tables with PKs, FKs, `NOT NULL`, unique constraints, `CHECK`s
- [ ] Write joins by hand: inner, left, and a self-join
- [ ] `EXPLAIN ANALYZE` a slow query before and after adding an index
- [ ] Transactions: two statements that must both succeed or neither
- [ ] Migrations: create, apply, roll back (a migration tool, not hand-run SQL)
- [ ] Seed script that produces 10k rows so you can *feel* performance
- [ ] Fix an N+1 query by replacing a loop with one join

- [ ] `npm run check:week1` passes every check (it reads your schema and names what is missing)

**Learn:** PostgreSQL official tutorial + [use-the-index-luke.com](https://use-the-index-luke.com). That's it.

**Artifact:** migrations + `db/seed.ts` + `queries.md` with your best 5 queries and their `EXPLAIN` output before/after indexing.

---

## Week 2 — HTTP API design (Nov 23–29)

- [ ] Routing, path vs query params, consistent response envelope
- [ ] **Input validation at the boundary** (schema validation, reject early)
- [ ] Centralized error handling: one error type → one response shape, no stack traces leaked
- [ ] Pagination done right: cursor-based, not `OFFSET 100000`
- [ ] Filtering/sorting with an allowlist (never interpolate user input into SQL)
- [ ] Status codes that actually mean something
- [ ] Idempotency keys on POST
- [ ] Structured JSON logs with request IDs
- [ ] API versioning decision, documented with the reason

**Learn:** MDN HTTP semantics + your framework's validation docs. Read 3 real public API docs (Stripe is the gold standard) and note what they do.

**Artifact:** full CRUD API over your Week 1 schema. `curl` examples for every endpoint in the README.

---

## Week 3 — Auth & security (Nov 30–Dec 6)

- [ ] Password hashing with argon2 or bcrypt (never SHA-256, never plaintext)
- [ ] Session cookies vs JWT — pick one, write down *why*, including the logout/revocation story
- [ ] Refresh-token rotation, or cookie sessions with `HttpOnly` + `Secure` + `SameSite`
- [ ] RBAC: roles enforced server-side, checked per route
- [ ] **Multi-tenancy:** every query scoped to the owning org — write the test that proves tenant A cannot read tenant B
- [ ] OWASP practicals: SQL injection, IDOR, mass assignment, rate limiting, secrets in env not code
- [ ] Password reset flow with single-use expiring tokens

**Learn:** OWASP Top 10 + OWASP Cheat Sheets. One auth library's docs. Nothing more.

**Artifact:** the API now requires auth; unauthorized requests get 401, wrong-tenant gets 403/404; a `SECURITY.md` listing what you did and what you skipped.

---

## Week 4 — Testing, jobs, failure (Dec 7–13)

- [ ] Unit vs integration tests — know which one you're writing and why
- [ ] Test DB strategy: ephemeral, migrated, seeded per run
- [ ] Tests for the happy path **and** the 401/403/404/409 paths
- [ ] Background jobs with Redis + BullMQ: email send, retry with backoff, dead-letter
- [ ] Caching: cache-aside with explicit TTL + invalidation, and a measured before/after
- [ ] Timeouts, retries with jitter, circuit-breaker thinking on outbound calls
- [ ] Graceful shutdown: finish in-flight work before exit

**Artifact:** test suite that runs in CI in under 60s, plus a worker process handling a real job with retries visible in logs.

---

## Week 5 — Docker, CI, deploy, load (Dec 14–20)

- [ ] Dockerfile: multi-stage, non-root user, small final image
- [ ] `docker compose` runs app + Postgres + Redis + worker with one command
- [ ] GitHub Actions: install → lint → typecheck → test → build, on every push
- [ ] Config via env with a documented, validated surface (fail fast on missing vars)
- [ ] Migrations run as part of deploy, safely
- [ ] Deploy the whole thing to a real host; document the URL
- [ ] **Load test with k6 or autocannon** — get p50/p95/p99, find the bottleneck
- [ ] Fix that bottleneck. Re-measure. Put both numbers in the README.

**This week is where a junior becomes credible.** "I found my p95 was 800ms because of a missing index, added one, got 60ms" is a better interview answer than any tutorial.

---

## Week 6 — The hard parts + design doc (Dec 21–27)

- [ ] Webhook *receiver*: signature verification, idempotent processing, replay protection
- [ ] Webhook *sender*: retries with backoff, dead-letter, signed payloads
- [ ] Concurrency: demonstrate a double-booking bug, then fix it with a transaction/lock/unique constraint
- [ ] File upload → object storage (S3-compatible), presigned URLs, size/type limits
- [ ] OpenAPI spec generated or hand-written for your API
- [ ] `ARCHITECTURE.md`: diagram, why each piece exists, what you'd change at 100x traffic

---

## Week 7 — Interview mode (Dec 28–31)

- [ ] 20 minutes, no notes: explain your architecture, one tradeoff you'd reverse, one bug that taught you something
- [ ] 3 mock system-design questions out loud: short URL service, rate limiter, booking system
- [ ] DSA-lite: 2 easy + 2 medium array/hash/string problems per day (interviews still screen on this)
- [ ] Resume: one project, quantified bullets, no skill-list padding
- [ ] GitHub profile: pinned repo, README with screenshot/diagram, no dead repos on page 1
- [ ] Apply to 10 roles. Yes, this week.

---

## Daily rhythm (~20 h/week — adjust, don't negotiate away)

| | Do |
|---|---|
| 15 min | Re-read yesterday's code. Fix one thing that bothers you. |
| 45 min | Learn one concept — one resource only |
| 60 min | Build it into the project immediately |
| 15 min | Commit, write 3 lines in the log below |

Weekends: one 4–5 h block on the artifact, one 2 h block on review/cleanup.

---

## Progress log

Append every day you work. This is your proof of momentum on the bad days.

| Date | What I built | What confused me | Next |
|---|---|---|---|
| 2026-11-09 | | | |

---

## Questions parking lot

(Anything that ate 45 minutes. Answer these on Sundays or ask.)

- [ ]

---

## The capstone (what Weeks 1–6 add up to)

One repo, one domain of your choosing (bookings, multi-tenant task manager, small SaaS). It must have:

1. Users + organizations (multi-tenancy, enforced and tested)
2. Auth with sessions or JWT, plus RBAC
3. CRUD with cursor pagination, filtering, validation
4. One background job with retries
5. One webhook receiver that is signature-verified and idempotent
6. Redis caching with a before/after measurement
7. Integration tests + CI green
8. Docker + one-command local start
9. Deployed, load-tested, numbers in the README
10. `ARCHITECTURE.md` with a diagram and a "what I'd change at scale" section

That brace of ten is a stronger signal than five CRUD todo apps, and it's exactly what the seven weeks produce if you don't skip.

---

## Resources — the entire allowed list

| Topic | One resource |
|---|---|
| Map of the field | [roadmap.sh/backend](https://roadmap.sh/backend) — as a *map*, never as a curriculum |
| HTTP | [MDN HTTP overview](https://developer.mozilla.org/en-US/docs/Web/HTTP) |
| SQL & indexes | [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html) + [use-the-index-luke.com](https://use-the-index-luke.com) |
| Security | [OWASP Top 10](https://owasp.org/www-project-top-ten/) + Cheat Sheets |
| Docker | [Docker getting started](https://docs.docker.com/get-started/) |
| Load testing | [k6 docs](https://k6.io/docs/) |
| Practice problems | [Exercism](https://exercism.org) or LeetCode (easy/medium arrays & hashes) |

Everything else is a distraction this quarter. Save it for January.
