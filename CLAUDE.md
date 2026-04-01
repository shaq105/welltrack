# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WellTrack** is a health symptom and wellness tracking application. This repo currently contains only the backend (Phase 1). A React frontend will be added in Phase 2. See [Documents/Requirements.md](Documents/Requirements.md) and [Documents/Tasks.md](Documents/Tasks.md) for the full 12-week roadmap.

## Commands

All commands run from `backend/`:

```bash
npm run dev      # Development server with hot reload (ts-node-dev)
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled output from dist/
npm test         # Run Jest test suite
npm run lint     # ESLint on src/**/*.ts
npm run format   # Prettier format src/**/*.ts
```

Run a single test file:
```bash
npx jest src/__tests__/health.test.ts
```

## Architecture

**Current state:** Express app with a single `/api/health` endpoint and empty scaffolding directories.

**Backend structure (`backend/src/`):**
- `index.ts` — Entry point, listens on `PORT` from `.env`
- `app.ts` — Express app setup, middleware, route mounting
- `controllers/` — Request handlers (one file per domain)
- `routes/` — Express routers that map HTTP methods to controllers
- `middleware/` — `authenticate` (JWT), `errorHandler` (global), input validation
- `lib/` — Shared utilities (database client, email, helpers)
- `__tests__/` — Jest + Supertest tests

**Planned API domains:**
- `/api/auth/*` — Register, login, refresh, logout, password reset
- `/api/users/me` — User profile
- `/api/symptoms`, `/api/symptom-logs`
- `/api/mood-logs`
- `/api/medications`, `/api/medication-logs`
- `/api/habits`, `/api/habit-logs`
- `/api/insights/*` — Trends and correlations
- `/api/export/*` — CSV export

**Planned stack additions (not yet installed):**
- Prisma ORM + PostgreSQL (database)
- Zod or express-validator (input validation)
- JWT with refresh tokens (auth)

## Environment

Copy `backend/.env.example` to `backend/.env`. Required variables:
- `PORT` — Server port (default 3000)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `SMTP_*` — Email config for password reset

## Key Conventions

- Strict TypeScript — no `any`, unused variables flagged (prefix with `_` to suppress)
- Prettier: single quotes, semicolons, trailing commas, 100-char line width, 2-space indent
- All authenticated routes must go through the `authenticate` middleware
- Log tables require `(user_id, logged_at)` composite indexes per requirements
- All users may only access their own data — return 403 otherwise

## Git Workflow

When completing tasks from TASKS.md:
1. Create a new branch named `feature/<task-number>-<brief-description>` before starting work
2. Make atomic commits with conventional commit messages:
   - feat: for new features
   - fix: for bug fixes
   - docs: for documentation
   - test: for tests
   - refactor: for refactoring
3. After completing a task, create a pull request with:
   - A descriptive title matching the task
   - A summary of changes made
   - Any testing notes or considerations
4. Update the task checkbox in TASKS.md to mark it complete

## Testing Requirements

Before marking any task as complete:
1. Write unit tests for new functionality
2. Run the full test suite with: `npm test`
3. If tests fail:
 - Analyze the failure output
 - Fix the code (no the tests, unless tests are incorrect)
 - Re-run tests until all pass
4. For API endpoints, include integration tests that verify:
 - Success responses with valid input
 - Authentication requirements
 - Edge cases

 ## Test Commands
 
- Backend tests: `cd backend && npm test`
- Frontend tests: `cd frontend && npm test`
- Run specific test file: `npm test -- path/to/test.ts`
- Run test matching pattern: `npm test -- --grep "pattern"`