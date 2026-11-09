# queries.md — Week 1 artifact

This file is the proof that you can *measure* a query, not just write one. It is
part of the Week 1 deliverable, alongside your schema and seed.

An empty `queries.md` is the difference between "I learned about indexes" and
"I found a 700ms query in my own schema, indexed it, and it became 8ms." Only the
second one survives an interview.

## What goes in here

**Five queries from your own domain.** Not textbook examples, not `SELECT * FROM
users` — queries you would actually write in the app you are modeling.

For each one, record:

1. **The question** in business terms, one sentence. ("Which bookings overlap for
   the same room in the next 7 days?")
2. **The SQL**, formatted.
3. **`EXPLAIN ANALYZE` before** — paste the whole plan, not just the timing.
4. **The index you added** (or the query you rewrote), and *why that one*.
5. **`EXPLAIN ANALYZE` after** — the whole plan again.
6. **The numbers**: before → after, in ms, from the plan's `Execution Time`.
7. **One sentence** on what changed in the plan (look for `Seq Scan` turning into
   `Index Scan`, or `Rows Removed by Filter` disappearing).

## Rules

- **Real volume.** Under 1,000 rows, a sequential scan always wins and you learn
  nothing. `npm run db:seed -- --rows=50000` before you measure.
- **Honest numbers.** Keep the bad ones. A file where every query improved 100x
  is a file you edited.
- **Plans, not vibes.** Paste the plan output. "Felt faster" is not a measurement.
- **At least one query with a join**, and at least one where the index did *not*
  help — and say why (low selectivity, small table, or the planner was right).

## How to run them

```bash
# one-off query
npm run db:sql -- "SELECT count(*) FROM bookings"

# a plan
npm run db:sql -- "EXPLAIN ANALYZE SELECT * FROM bookings WHERE room_id = 7"

# a longer query kept in a file
npm run db:sql -- --file db/queries/001-overlapping-bookings.sql
```

Add the index in a **new migration** (`003_add_booking_index.sql`), run
`npm run db:migrate`, then measure again. An index added by hand in a client is
an index that vanishes the next time someone rebuilds the database.

---

## Query 1 — `<the business question>`

**SQL**

```sql
-- your query here
```

**Before**

```
EXPLAIN ANALYZE output, pasted
```

**Index added**

```sql
-- your index here
```

**After**

```
EXPLAIN ANALYZE output, pasted
```

**Numbers:** `___ ms → ___ ms`

**What changed in the plan:** `___`

---

## Query 2 — `<the business question>`

**SQL**

```sql
```

**Before**

```
```

**Index added**

```sql
```

**After**

```
```

**Numbers:** `___ ms → ___ ms`

**What changed in the plan:** `___`

---

## Query 3 — `<the business question>`

**SQL**

```sql
```

**Before**

```
```

**Index added**

```sql
```

**After**

```
```

**Numbers:** `___ ms → ___ ms`

**What changed in the plan:** `___`

---

## Query 4 — `<the business question>`

**SQL**

```sql
```

**Before**

```
```

**Index added**

```sql
```

**After**

```
```

**Numbers:** `___ ms → ___ ms`

**What changed in the plan:** `___`

---

## Query 5 — `<the query where the index did NOT help>`

**SQL**

```sql
```

**Before**

```
```

**What you tried**

```sql
```

**After**

```
```

**Numbers:** `___ ms → ___ ms`

**Why it did not help:** `___`

---

## Done when

- [ ] Five queries from your own schema
- [ ] Every one has a real `EXPLAIN ANALYZE` plan pasted before and after
- [ ] At least one join, and at least one honest "this did not help"
- [ ] Every index lives in a migration file, not in a client session
- [ ] `npm run check:week1` is green
