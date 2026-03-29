# YorkLog Backend — Claude Code Instructions

## Documentation & Notes Rule
All documentation files (`.md`, `.docx`, `.pdf`) must live inside the `notes/` folder at the repo root — never scattered at the root level.
- **`notes/`** — active, current documents (plans, specs, tasks in progress)
- **`notes/old/`** — completed or historical documents (done work, old plans)

The only files exempt from this rule are `CLAUDE.md` and `README.md` — they stay at the root.

When creating any new doc file, always save it to `notes/`. When a document is no longer actively needed, move it to `notes/old/`.

---

## Project Overview
Internal time-tracking API for York Press remote teams.

- **Runtime**: Node.js 18+ (ES Modules — `"type": "module"` in package.json)
- **Framework**: Express.js
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT stored in httpOnly cookies + bcrypt password hashing
- **Validation**: Zod
- **Roles**: `employee`, `dept_manager`, `hr_finance`, `super_admin`
- **Package manager**: npm

---

## Folder Structure
```
src/
  app.js              ← Express entry point — mounts all routes, global middleware
  controllers/        ← Request handlers (receive req, call service, send res)
  middleware/         ← auth.middleware.js, role.middleware.js
  routes/             ← Route definitions (map URLs to controllers)
  services/           ← Business logic (email, cron, export)
prisma/
  schema.prisma       ← Database schema (source of truth)
  seed.js             ← Demo data seeder
```

### Request flow
```
HTTP request → route → middleware (auth + role) → controller → Prisma → response
```

---

## Code Conventions
- ES module syntax throughout (`import`/`export`) — never use `require()`
- No `console.log` left in finished code — use them while debugging, remove before committing
- No TODO or FIXME comments — either implement it or leave it out
- Controllers are thin: validate input, call Prisma or a service, return the response
- All Prisma queries live in controllers or services — never inline SQL
- Always handle errors with `try/catch` and pass to `next(err)` for the global error handler
- Zod validation happens at the top of each controller before any DB calls

---

## Environment Variables
All secrets live in `.env` (never committed). Reference `.env.example` for the full list:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — secret for signing tokens
- `FRONTEND_URL` — for CORS allow-list
- `SMTP_*` — email sending credentials
- `REMINDER_CRON` — cron expression for daily reminders (`"0 14 * * 1-5"` = 17:00 Beirut)

---

## Prisma Workflow
```bash
npm run db:generate   # regenerate Prisma client after schema changes
npm run db:migrate    # apply schema changes to the database
npm run db:seed       # seed demo data (4 users, 4 projects, task types)
npm run db:studio     # open Prisma Studio GUI (great for inspecting data)
```

**Never edit the database directly** — always go through migrations.

---

## After Every Task
Run the following to confirm the server starts without errors:
```bash
node --check src/app.js
```
If the task adds or changes a route, also make sure the server actually starts:
```bash
npm run dev
```

---

## Commit Rules
- **Format**: Imperative short — `Add project assignment endpoint`, `Fix date validation in timesheets controller`
- **No prefixes**: Never use `feat:`, `fix:`, `chore:` etc.
- **Atomic**: One commit per file or logical unit — never batch multiple files
- **No `.md` files**: Never commit documentation — exception: `CLAUDE.md` itself
- **No Co-Authored-By**: Keep Abed as the sole author in every commit
- **Branch**: Commit directly to `main` — no feature branches

---

## Key Business Rules (never break these)
1. Employees can only log hours against projects they are explicitly assigned to (`ProjectAssignment` table)
2. Task types belong to a specific project — a task from Project A cannot be used for Project B
3. Daily hour totals are validated against the department's `maxDailyHours` at the controller level
4. Edit requests store a full JSONB snapshot of the original entry in `originalData` before any changes
5. The `dept_manager` role can only see data scoped to their own department — never cross-department
6. JWT tokens are only read from httpOnly cookies (never from `Authorization` headers in production flows)
