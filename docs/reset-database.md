# How to Reset the Database

## Production (Heroku)

```bash
# 1. Wipe the database
heroku pg:reset DATABASE_URL --app ontooff --confirm ontooff

# 2. Run all migrations
heroku run "npx prisma migrate deploy" --app ontooff

# 3. Seed the super admin
heroku run "npx ts-node --project tsconfig.seed.json prisma/seed.ts" --app ontooff
```

**Result:** All data wiped, migrations re-applied, super admin recreated.

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `radovanovica1993@gmail.com` | `,14dmin123!` |

---

## Local

```bash
# Drops DB, re-runs all migrations, and seeds automatically
npm run db:reset
```

Or step by step:

```bash
# 1. Reset + migrate
npx prisma migrate reset

# 2. Seed only (safe to run multiple times — uses upsert)
npm run db:seed
```
