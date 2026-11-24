# InjeraOS Production Deployment Guide (Vercel + Render)

This architecture separates the **Frontend (Client)** on **Vercel** and the **Backend (Server)** on **Render**.

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│         Vercel (Client)         │       │          Render (Server)        │
│  React 19 + Vite + Tailwind v4  │ ───►  │  Express 5 + Prisma + Node.js   │
│  SPA Routing via vercel.json    │ CORS  │  Dockerfile / Web Service       │
└─────────────────────────────────┘       └──────────────┬──────────────────┘
                                                         │
                                                         ▼
                                          ┌─────────────────────────────────┐
                                          │      PostgreSQL Database        │
                                          │   Render Postgres / Managed DB  │
                                          └─────────────────────────────────┘
```

---

## 1. Backend Deployment on Render

### Method A: Deploy via Docker (Recommended)
1. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New + > Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name**: `injera-api` (or your preferred name)
   - **Region**: Select your preferred region (e.g., Frankfurt, Oregon)
   - **Root Directory**: `server`
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Build Context**: `.`
4. Set the **Health Check Path** to `/healthz`.

### Method B: Deploy via Node Runtime
If you prefer running directly with Node on Render instead of Docker:
- **Root Directory**: `server`
- **Runtime**: **Node**
- **Build Command**: `corepack enable && pnpm install --frozen-lockfile && pnpm run db:generate && pnpm run build`
- **Start Command**: `pnpm run db:deploy && pnpm start`
- **Health Check Path**: `/healthz`

### Environment Variables on Render
Add the following in your Render Web Service **Environment** tab:

| Variable | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production environment flag |
| `DATABASE_URL` | `postgresql://...` | Connection string to PostgreSQL (use Internal URL if hosted on Render) |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` | Vercel domain (supports comma-separated origins) |
| `JWT_SECRET` | `(32+ random characters)` | Cryptographic secret for access tokens |
| `JWT_REFRESH_SECRET` | `(32+ random characters)` | Cryptographic secret for refresh tokens |
| `RUN_MIGRATIONS` | `true` | Automatically executes `prisma migrate deploy` on startup |
| `SEED_SUPERADMIN` | `false` | Set `true` on first boot if you want initial superadmin created |
| `SUPERADMIN_EMAIL` | `admin@bakery.et` | Initial superadmin email (if seeding) |
| `SUPERADMIN_PASSWORD` | `YourSecurePassword!` | Initial superadmin password (if seeding) |

---

## 2. Frontend Deployment on Vercel

1. Go to the [Vercel Dashboard](https://vercel.com/new) and import your Git repository.
2. In the project configuration:
   - **Root Directory**: Click "Edit" and choose `client`.
   - **Framework Preset**: `Vite` (automatically detected).
   - **Build Command**: `pnpm run build` (or Vite default).
   - **Output Directory**: `dist`.
3. In **Environment Variables**, add:
   - **`VITE_API_URL`**: `https://injera-api.onrender.com/api` (Replace with your actual Render service URL).
4. Deploy the project.
5. Vercel automatically reads `client/vercel.json` to route all SPA routes to `index.html`.
6. Once deployed, copy your Vercel production URL (e.g., `https://your-app.vercel.app`) and ensure it matches the `CLIENT_ORIGIN` environment variable in your Render backend.

---

## 3. Local Development with Docker in `server/`

To run the database and server locally using Docker:

```bash
cd server
docker compose up --build -d
```

- API health probe: `http://localhost:3000/healthz`
- Database runs on port `5432` with volume `injera_pgdata`.
