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
