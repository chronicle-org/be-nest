# 🛠️ Chronicle — Backend API (NestJS)

> The backbone of Chronicle — powering stories, authentication, and cross-platform sync.

Chronicle Backend is the core API service of the Chronicle ecosystem. It connects the web and mobile apps to secure data storage, manages user accounts, and handles everything behind the scenes so writers can focus on telling stories that matter.

---

## 🚀 What this service does

- 🔐 User authentication & authorization
- 📝 Create, edit, publish, and delete stories
- 💾 Drafts support
- 👤 User profiles & settings
- 🗂️ Organize stories into collections
- 🔄 Real-time synchronization across devices
- 🌍 REST API consumed by Web & Mobile apps

---

## 🧰 Tech Stack

- **Framework:** NestJS + TypeScript  
- **Database:** PostgreSQL (Supabase)  
- **ORM:** TypeORM  
- **API Style:** REST (GraphQL optional)  
- **Deployment:** Google Cloud Run  
- **Auth:** JWT / Supabase Auth


[**Swagger**](https://app.swaggerhub.com/apis/AdithiaSandi/chronicle-api/1.0.0)

## 🗄️ Database migrations

The schema is managed by TypeORM migrations in `src/migrations`; the app applies pending ones on boot (`synchronize` is off).

- After changing an entity: `npm run migration:generate -- src/migrations/DescribeTheChange`, then review and commit the generated file.
- `npm run migration:check` fails if entities and migrations disagree (CI runs this).
- `npm run migration:revert` undoes the latest migration.

Set `DB_SSL=false` when your local Postgres has no SSL.

Posts saved before HTML cleaning was added can be cleaned in place with `npm run posts:sanitize` (a dry run that lists what would change), then `npm run posts:sanitize -- --apply` to write. It uses `DATABASE_URL`, so point it at the database you mean to clean.

Set `SIGNUP_ENABLED=false` to close sign up: `POST /auth/register` then returns 403. Unset or any other value keeps it open. Restart the app after changing it.

Password reset by email (`POST /auth/forgot-password`, then `POST /auth/reset-password`) sends through [Resend](https://resend.com). Set `RESEND_API_KEY`, `MAIL_FROM` (a sender on a domain verified in Resend, e.g. `Chronicle <hello@yourdomain.com>`) and `WEB_URL` (the web app's address, used for the link; defaults to the first `CORS_ORIGIN`). Until they're set, forgot password returns 503 and nothing is sent. Reset links last 30 minutes, work once, and log out every device.

## ❤️ Health check

`GET /health` returns 200 `{ "status": "ok" }` when the API can reach its database, and 503 otherwise. CI's boot check uses it, and it can serve as Cloud Run's startup or liveness probe.

## 🧪 Tests

- `npm test` runs the unit tests.
- `npm run test:e2e` boots the whole app against the database in `DATABASE_URL` and exercises auth, posts, likes and follows over HTTP. Point it at a throwaway database: it creates users and posts (emails are unique per run, so it can be re-run). CI runs it against a fresh Postgres on every PR.
