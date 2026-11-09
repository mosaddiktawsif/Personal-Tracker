# Week 0 — Self-Audit

**Fill this in today, before you read anything else.** It takes 20–25 minutes.

## How to use this file

1. **No searching, no AI, no docs, no asking anyone.** This is a diagnostic, not a test.
2. Write what you actually think, in your own words. Two sentences beats a paragraph of hedging.
3. If you don't know, write **"no idea"** and move on. That is a _useful_ answer — it is the whole point.
4. Score your confidence honestly. Optimism here costs you weeks of study in the wrong place.
5. Do **not** edit your answers afterwards. You need the unflattering version as a baseline, and in three weeks re-reading it is how you'll see how far you came.

### Confidence scale

| Score | Meaning                                                     |
| ----- | ----------------------------------------------------------- |
| **0** | Never heard of it, or "no idea"                             |
| **1** | Recognise the words, couldn't explain it                    |
| **2** | Could explain it roughly, wouldn't trust myself to build it |
| **3** | Could implement it today without looking it up              |

---

## Question 1 — HTTP status codes

What is the difference between `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422` and `500`? For each, give the situation where you would return it.

```
Your answer:
These codes are the HTTPS response to the user . as 404 means error . and 201 means okay. I couldn't remember all the code means but i do know the meaning of the codes


```

Confidence (0–3): `2`

---

## Question 2 — Transactions

What does a database transaction guarantee? Explain ACID in your own words.

```
Your answer:
No  Idea



```

Confidence (0–3): `0`

---

## Question 3 — Indexes

Why does an index make a query faster, and what does it cost you?

```
Your answer:
Index works like in a slot. as we know there's some lifo and fifo behavior due to a fast query. I hope that alies with the ans


```

Confidence (0–3): `1`

---

## Question 4 — The request lifecycle

What happens between a browser sending a request and your handler function running? List the steps you know.

```
Your answer:



```

Confidence (0–3): `1`

---

## Question 5 — Authentication vs authorization

What is the difference, and which one does a `401` belong to?

```
Your answer:

can not explain

```

Confidence (0–3): `1`

---

## Question 6 — Race conditions

What is a race condition? Give a backend example (not a UI one).

```
Your answer:

no idea

```

Confidence (0–3): `0`

---

## Question 7 — Migrations

What is a database migration, and why can't you just edit the table by hand?

```
Your answer:

No idea

```

Confidence (0–3): `0`

---

## Your results

Copy your scores here so you can compare at the end of Week 3.

| #   | Topic               | Score    | Maps to |
| --- | ------------------- | -------- | ------- |
| 1   | Status codes        | `2`      | Week 2  |
| 2   | Transactions / ACID | `0`      | Week 1  |
| 3   | Indexes             | `1`      | Week 1  |
| 4   | Request lifecycle   | `1`      | Week 2  |
| 5   | AuthN vs AuthZ      | `1`      | Week 3  |
| 6   | Race conditions     | `0`      | Week 3  |
| 7   | Migrations          | `0`      | Week 1  |
|     | **Total**           | `5` / 21 |         |

**Marked independently on 2026-11-09**, against what the answers actually say
rather than how familiar the topics feel:

| # | Topic | You said | Marked |
|---|---|---|---|
| 1 | Status codes | 2 | **1** |
| 2 | Transactions / ACID | 0 | **0** |
| 3 | Indexes | 1 | **1** |
| 4 | Request lifecycle | 1 | **0** |
| 5 | AuthN vs AuthZ | 1 | **0** |
| 6 | Race conditions | 0 | **0** |
| 7 | Migrations | 0 | **0** |
| | **Total** | 5 | **2** / 21 |

The gap between the two columns is the finding, not the total: you recognise
all seven topics and can implement none of them yet, and confidence is running
about a point high on three of them. Do not edit the answers above — compare
against them at the end of Week 3.

---

## How to read the results

Tally the total, then pick your weighting. **The rule: your lowest scores get extra hours, your highest scores get _skipped reading_, not extra reading.**

### Total 0–8 — "the basics aren't solid yet"

Don't start Week 1's project on Monday blind. Spend the remaining Week 0 days on two things only:

- Q4 (request lifecycle) — read the MDN HTTP overview once. You need a mental picture of request → routing → handler → response.
- Q2/Q3/Q7 — do the PostgreSQL tutorial's first three chapters, typing every query yourself.

Then start Week 1 as written. Do **not** restart the roadmap from scratch — a 0–8 total after "50–60% understood" usually means vocabulary gaps, not conceptual ones, and those close in days.

### Total 9–15 — "on track, patch the holes"

Run the weeks as written, with these adjustments:

- Any Week 1 topic (Q2/Q3/Q7) scoring **0–1** → spend an extra 45 minutes per day on SQL in Week 1, and do the `EXPLAIN ANALYZE` exercise twice, on two different queries.
- Any Week 2 topic (Q1/Q4) scoring **0–1** → read the status-code table on MDN before writing your first endpoint, and add 30 minutes to Week 2's first two days.
- Any Week 3 topic (Q5/Q6) scoring **0–1** → read the OWASP Top 10 intro _before_ Week 3 starts, not during. Race conditions (Q6) deserve a real experiment: run two concurrent requests against a row and watch the lost update.

### Total 16–21 — "ahead of the plan, spend the time on hard things"

- Skip the reading blocks in Weeks 1–2 and go straight to the artifacts. Prove it by building, not by reading.
- Push the hours you save into **Week 5** (load testing, CI, deploys) and **Week 6** (webhooks, idempotency, concurrency). Those are the parts that separate a junior from a _believable_ junior.
- Your real risk is different: you may be able to talk about this stuff without ever having shipped it. Fix that by making Week 5's measurements non-optional.

### One more signal, worth as much as the total

Look at **which** questions were 0–1:

- Mostly **Q1, Q4** → you think in code, not in HTTP. Week 2 is your growth week.
- Mostly **Q2, Q3, Q7** → the most common self-taught gap. Week 1 is the highest-leverage week of your life this year; do not rush it.
- Mostly **Q5, Q6** → you've built things that work for one user. Week 3 is where "works on my machine" becomes "works under attack".
- **Q6 scoring 0 while others score 2+** is a specific warning: concurrency is the topic most people _think_ they understand. Treat Week 6's double-booking exercise as mandatory.

---

## After you fill this in

Two blocks, matching `ROADMAP.md`. Do not start the second early — the first is
what makes the second fast.

### Rest of Week 0 (Nov 9–15) — foundations and the first deploy

1. `cp .env.example .env`
2. Get Postgres running and apply migrations — see `README.md`
3. `npm run db:seed` — prints guidance until your schema exists
4. `npm test` — it must pass before you design anything
5. Read MDN "Overview of HTTP" once, and your framework's getting-started page.
   Nothing else — this is the answer to Q4 when you rewrite it.
6. Deploy `/health` and `/db/check` to a public URL and put that URL in the
   README. **This is Week 0's done-when**: one public URL returning
   `{"status":"ok"}`, and a commit.

### Week 1 (Nov 16–22) — SQL and schema

1. Rename `db/migrations/002_domain_schema.sql.todo` to `.sql` and model your
   domain in 6–10 tables, with PKs, FKs, `NOT NULL`, unique constraints, `CHECK`s.
2. `npm run check:week1` after every migration, until every check passes.
3. Add seeders to `db/seed.ts` so you have 10k rows to measure against.
4. Record five measured queries in `queries.md`, each with its `EXPLAIN` plan
   before and after indexing — that is the Week 1 artifact.
