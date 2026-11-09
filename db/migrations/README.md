# Migrations

Files here are applied in filename order by `npm run db:migrate`.

| Rule | Why |
|---|---|
| One change per file | A failure rolls back exactly one thing |
| Never edit a file that has already been applied | Other databases already ran the old version |
| Prefix numerically: `002_`, `003_` | Ordering is the filename |
| Only `*.sql` is executed | `.sql.todo` is a draft you can leave half-written |

`schema_migrations` records what has run. `npm run db:migrate` prints `skip` for
anything already applied, so it is safe to run on every startup and in CI.

## The two files here

- `001_meta.sql` — infrastructure (`app_meta`), used by `/db/check` and the tests.
- `002_domain_schema.sql.todo` — **your** schema. Rename it to `.sql` when ready.

## Rolling back

There is no down-migration by design: forward-only is simpler to reason about
and is what most production teams converge on. To undo locally, either write a
new migration that reverses the change, or wipe the volume and re-apply:

```bash
docker compose down -v && docker compose up -d && npm run db:migrate
```
