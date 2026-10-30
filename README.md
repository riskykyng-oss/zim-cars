# Zim Cars

Lead attribution, inventory and commission management for a Zimbabwean car marketplace.

- **Public site:** browse cars, view details, send WhatsApp-tracked enquiries.
- **Dealer dashboard:** manage listings and photos, work leads, record sales.
- **Admin dashboard:** confirm sales, track attribution and record commission payments.
- **Attribution:** every enquiry stores its source, referral code, page URL and a short lead ID.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS |
| API | Node.js 20+, Express 4 |
| Database | PostgreSQL (Supabase) with Prisma |
| Image storage | Supabase Storage (public bucket) |
| Sessions | Postgres-backed `express-session` store |
| Hosting | Vercel (static site + one serverless API function) |

## Project layout

```
api/[...path].js        Vercel catch-all function that runs the Express app
client/                 React app (built to client/dist)
server/src/app.js       Express app (exported for Vercel, listens locally)
server/prisma/          Prisma schema, migrations and seed
server/scripts/         Supabase bucket setup and local-upload migration
vercel.json             Build, output and SPA fallback configuration
```

## Local development

Requirements: Node.js 20+, npm 10+, a PostgreSQL database, and (optionally) a
Supabase project for image storage.

```bash
npm install
npm run generate                     # generate the Prisma client
cp server/.env.example server/.env   # then fill in the values
npm run db:deploy                     # apply migrations
npm run db:seed                       # create the first admin/dealer
npm run dev                           # client on :5173, API on :5000
```

Without Supabase credentials, uploads fall back to `server/uploads` on local
disk. Production always requires Supabase Storage.

### Environment variables

All variables live in `server/.env`. On Vercel, add the same keys in
**Project → Settings → Environment Variables**. Never commit `.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Supabase connection (port `6543`, `?pgbouncer=true&connection_limit=1`). Used by Prisma Client and sessions. |
| `DIRECT_URL` | Yes | Direct Supabase connection (port `5432`). Used by Prisma migrations. |
| `SESSION_SECRET` | Yes | Long random string. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `CLIENT_URL` | Yes | Public site origin, e.g. `https://zim-cars.vercel.app`. Comma-separate multiple origins. |
| `SUPABASE_URL` | Yes (prod) | `https://<project-ref>.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | Server-only key. Never expose it to the browser. |
| `SUPABASE_STORAGE_BUCKET` | No | Defaults to `vehicle-images`. |
| `DEALER_WHATSAPP` | Yes | Number used for enquiry links, e.g. `+263771234567`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed only | First admin account. Required when seeding production. |
| `DEALER_OWNER_EMAIL` / `DEALER_OWNER_PASSWORD` | Seed only | First dealer account. Required when seeding production. |
| `SEED_SAMPLE_DATA` | No | `true` inserts three demo vehicles on an empty database. Defaults to `false` in production. |

`PORT` and `NODE_ENV` are optional locally.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string**:
   - copy the **pooled** URI into `DATABASE_URL` (add `?pgbouncer=true&connection_limit=1`);
   - copy the **direct** URI into `DIRECT_URL`.
3. **Project Settings → API**: copy the project URL and the `service_role` key.
4. Create the storage bucket and policies:

   ```bash
   cd server
   npm run storage:setup
   ```

   This creates a public `vehicle-images` bucket limited to JPEG/PNG/WebP files
   up to 4 MB. Public read access is required for marketplace images; uploads
   and deletes only happen server-side with the service role key.

5. Apply the schema and create the first accounts:

   ```bash
   npm run db:deploy
   npm run db:seed
   ```

   Seeding is idempotent for users — an existing email is never overwritten.

## Deploying to Vercel

The repository is a single Vercel project: the Vite build is served statically
and every `/api/*` request is handled by `api/[...path].js`.

### Option A — GitHub integration (recommended)

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project → Import** the repository.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory:
   `client/dist` (already set in `vercel.json`).
4. Add every production environment variable listed above before the first
   deploy. Set `CLIENT_URL` to the final URL. Do **not** set `NODE_ENV`
   manually — Vercel sets it automatically, and a manually set
   `NODE_ENV=production` can make npm skip dev dependencies during install.
5. Deploy.
6. Point `CLIENT_URL` at the assigned domain (and any custom domain), then
   redeploy if it changed.
7. Run migrations and the seed once against the production database from your
   machine, using the Supabase values:

   ```bash
   cd server
   npm run migrate:deploy
   npm run seed
   ```

   Until migrations have run, the API will return errors because the tables do
   not exist yet.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL production
# ...repeat for every variable
vercel --prod
```

### Local images → Supabase Storage

If the current database still stores `/uploads/...` paths, migrate them after
configuring Supabase:

```bash
cd server
npm run storage:migrate   # uploads server/uploads/* and updates image URLs
```

## Operational notes

- **Uploads:** capped at 4 MB because Vercel rejects request bodies above
  4.5 MB. Only JPEG, PNG and WebP are accepted; the extension and MIME type
  must agree.
- **Sessions:** stored in Postgres (`session` table, created automatically).
  Cookies are `HttpOnly`, `SameSite=Lax` and `Secure` in production.
- **Rate limits:** 600 API requests per 15 minutes per IP, 10 login attempts per
  15 minutes, and 10 lead submissions per hour.
- **Money rules:** commission payments require a confirmed sale and cannot
  exceed the outstanding balance. Pending sales are excluded from earned
  commissions.
- **Audit trail:** vehicle, lead, sale and payment changes write to
  `audit_logs`; lead status changes also write to `lead_events`.
- **Health check:** `GET /api/health`.

## Useful commands

```bash
npm run build          # build client + generate Prisma client
npm run db:deploy      # prisma migrate deploy
npm run db:seed        # seed admin/dealer (+ optional demo cars)
npm run db:studio      # Prisma Studio
npm run storage:setup  # create/verify the Supabase bucket
npm run storage:migrate
```
