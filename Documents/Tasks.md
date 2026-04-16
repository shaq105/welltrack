# WellTrack - Implementation Tasks

> Tasks are organized by phase and sized for an intermediate developer (~half a day to a few days each).  
> Check off tasks as you complete them.

---

## Phase 1: Backend Foundation (Weeks 1–3)

### Project Setup
- [x] Initialize Node.js/Express project with TypeScript (`tsconfig.json`, `ts-node-dev`)
- [x] Set up folder structure: `src/routes`, `src/controllers`, `src/middleware`, `src/lib`
- [x] Configure ESLint + Prettier with a shared config
- [x] Set up environment variables with `dotenv` (`.env.example` with all required keys)
- [x] Add a basic health-check endpoint `GET /api/health`

### Database
- [x] Install and configure Prisma with a PostgreSQL connection
- [x] Write the Prisma schema for all models: `User`, `Symptom`, `SymptomLog`, `MoodLog`, `Medication`, `MedicationLog`, `Habit`, `HabitLog`
- [x] Add database indexes on `(user_id, logged_at)` for all log tables
- [ ] Run initial migration (`prisma migrate dev`)
- [x] Write a seed script that inserts default symptoms (Headache, Fatigue, Joint Pain, etc.) and default habits (Sleep Duration, Water Intake, Exercise, Alcohol, Caffeine)

### Authentication
- [x] Implement `POST /api/auth/register` — hash password with bcrypt, return JWT + refresh token
- [x] Implement `POST /api/auth/login` — validate credentials, return JWT + refresh token
- [x] Implement `POST /api/auth/refresh` — validate refresh token, return new JWT
- [x] Implement `POST /api/auth/logout` — invalidate refresh token
- [x] Implement `POST /api/auth/forgot-password` — generate reset token, send email (use Nodemailer or a transactional email service)
- [x] Implement `POST /api/auth/reset-password` — validate token, update password hash
- [x] Write `authenticate` middleware that verifies JWT and attaches `req.user`

### User Endpoints
- [x] Implement `GET /api/users/me` — return profile (id, email, display_name, timezone)
- [x] Implement `PATCH /api/users/me` — update display_name and/or timezone
- [x] Implement `DELETE /api/users/me` — delete user and all related data (cascade)

### Symptoms & Symptom Logs
- [x] Implement `GET /api/symptoms` — return system defaults + user's custom symptoms
- [x] Implement `POST /api/symptoms` — create a custom symptom for the current user
- [x] Implement `PATCH /api/symptoms/:id` — update name/category/is_active (own symptoms only)
- [x] Implement `DELETE /api/symptoms/:id` — delete a custom symptom (own symptoms only)
- [x] Implement `GET /api/symptom-logs` — filtered by `startDate`, `endDate`, `limit`, `offset`
- [x] Implement `POST /api/symptom-logs` — validate severity is 1–10
- [x] Implement `PATCH /api/symptom-logs/:id` — update severity/notes/logged_at (own logs only)
- [x] Implement `DELETE /api/symptom-logs/:id` — delete own log entry

### Mood Logs
- [x] Implement `GET /api/mood-logs` — filtered by `startDate`, `endDate`
- [x] Implement `POST /api/mood-logs` — validate mood_score (1–5), energy_level (1–5), stress_level (1–5)
- [x] Implement `PATCH /api/mood-logs/:id` and `DELETE /api/mood-logs/:id`

### Medications & Medication Logs
- [x] Implement full CRUD for `GET/POST/PATCH/DELETE /api/medications`
- [x] Implement `GET /api/medication-logs` — filtered by `startDate`, `endDate`
- [x] Implement `POST /api/medication-logs` — log taken/not-taken with optional `taken_at`
- [x] Implement `PATCH /api/medication-logs/:id` and `DELETE /api/medication-logs/:id`

### Habits & Habit Logs
- [x] Implement full CRUD for `GET/POST/PATCH/DELETE /api/habits`
- [x] Implement `GET /api/habit-logs` — filtered by `startDate`, `endDate`
- [x] Implement `POST /api/habit-logs` — store correct value field based on tracking_type (boolean/numeric/duration)
- [x] Implement `PATCH /api/habit-logs/:id` and `DELETE /api/habit-logs/:id`

### Validation & Error Handling
- [x] Add a global error-handling middleware that returns consistent `{ error, message }` JSON responses
- [x] Add input validation using Zod (or express-validator) on all POST/PATCH routes
- [x] Return 403 if a user tries to modify another user's data

---

## Phase 2: Frontend Foundation (Weeks 4–6)

### Project Setup
- [x] Initialize React + TypeScript app with Vite
- [x] Install and configure Tailwind CSS (soft color theme: teal, sage)
- [x] Set up React Router with route definitions for all screens
- [x] Create an API client (Axios instance) with base URL from env, and interceptors that attach the JWT and handle 401 token refresh

### Auth Pages & Flow
- [x] Build Register page (email, password, display name fields + form validation)
- [x] Build Login page
- [x] Build Forgot Password page (email input, success message)
- [x] Build Reset Password page (new password + confirm, reads token from URL)
- [x] Create a `ProtectedRoute` component that redirects unauthenticated users to `/login`
- [x] Implement auth state management (React Context or Zustand) to store user info and tokens

### Dashboard
- [x] Build the Dashboard layout: today's date, logged-today summary, quick-add buttons
- [x] Add a "days logged this week" or streak indicator
- [x] Wire up quick-add buttons to open the correct log modal

### Log Entry Forms
- [x] Build Symptom log modal: symptom selector, severity slider (1–10), notes, date picker
- [x] Build Mood log modal: mood score (1–5), optional energy/stress levels, notes, date picker
- [x] Build Medication log modal: medication selector, taken toggle, optional taken_at time
- [x] Build Habit log modal: habit selector, value input (adapts to tracking_type), notes, date picker
- [x] All modals should support both "create" and "edit" modes

---

## Phase 3: Full Features (Weeks 7–9)

### History View
- [x] Build History page: fetch logs across all types, group and display by day
- [x] Add type filter tabs (All / Symptoms / Mood / Medications / Habits)
- [x] Make entries expandable/tappable to open the edit modal

### Trends & Charts
- [x] Install Recharts (or similar) and build a reusable `LineChart` component
- [x] Build Trends page with 7 / 30 / 90 day range picker
- [x] Add symptom severity trend chart (one line per symptom)
- [x] Add mood / energy / stress trend chart
- [x] Build a calendar heatmap showing days with logged entries

### Settings & Customization
- [x] Build Settings page with sections for Profile, Symptoms, Habits, Medications, Data, Account
- [x] Profile section: edit display name and timezone, save via `PATCH /api/users/me`
- [x] Symptoms section: toggle visibility of system symptoms, add custom symptoms, delete custom ones
- [x] Habits section: toggle visibility of system habits, add custom habits, delete custom ones
- [x] Medications section: add, edit, deactivate, and delete medications
- [x] Account section: logout button, delete account button (with confirmation dialog)

### Data Export
- [x] Implement `GET /api/export/csv` backend endpoint — query all user logs within date range and format as CSV
- [x] Add export button in Settings that calls the endpoint and triggers a browser file download

---

## Phase 4: Polish & Launch (Weeks 10–12)

### Testing
- [x] Write integration tests for all auth endpoints (register, login, refresh, logout)
- [x] Write integration tests for at least one full CRUD flow (e.g., symptom logs)
- [ ] Manually test all log modals on mobile screen sizes

### Mobile Responsiveness
- [x] Audit all pages on small screens (375px wide) and fix layout issues
- [x] Ensure tap targets are large enough (min 44x44px) for users with motor difficulties
- [x] Test and fix any overflow or scroll issues on the Dashboard and History pages

### Performance
- [x] Confirm database indexes exist on `(user_id, logged_at)` for all log tables
- [x] Add pagination or virtual scrolling to the History page if entry count is large
- [x] Lazy-load chart components so the Dashboard loads fast

### Deployment
- [x] Set up backend deployment on Railway or Render (add `start` script, configure env vars)
- [x] Set up frontend deployment on Vercel (configure build command and env vars)
- [x] Ensure HTTPS is enforced end-to-end
- [ ] Run `prisma migrate deploy` against the production database
- [ ] Smoke test all critical flows in production before inviting beta users

---

## Nice-to-Haves (If Time Permits)

- [x] Daily reminder emails (cron job + Nodemailer)
- [x] Correlation insights (e.g., "You sleep worse on days you have caffeine")
- [x] PDF export formatted for doctor visits
- [x] Onboarding flow for new users (step-by-step intro modal)
