# InjeraOS Production & Deployment Guide

This guide details production deployment, containerization, reverse proxying, and the system's fault-tolerant error handling and offline operational mechanisms.

---

## 1. Resilience & Network Fault-Tolerance Architecture

### Client-Side Error & Offline Handling
The client is architected to operate safely during network blackouts, server restarts, and component exceptions:
1. **Global React Error Boundary (`ErrorBoundary.tsx`)**:
   - Catches uncaught render crashes in the component tree.
   - Prevents blank white screens by displaying a clear recovery screen with options to *Reload Application*, *Try Again*, or *Return to Dashboard*.
   - Safeguards the user's unsynced local changes and offline ledger.
2. **Persistent Network & Offline Status Banner (`NetworkStatusBar.tsx`)**:
   - Continuously monitors browser connectivity (`online` / `offline` window events) and active backend server reachability (`/health` / `/healthz`).
   - If the device loses internet or the backend server drops, an amber status banner alerts the operator:
     - Operations automatically route to the **IndexedDB offline queue**.
     - Displays real-time pending queue counts.
     - Provides a **Check Connectivity** button to test the connection.
     - Auto-triggers queue synchronization the moment connectivity is restored.
3. **Axios Network Interceptor & Retries (`api.ts`)**:
   - Intercepts network failure (`ERR_NETWORK`, `ECONNABORTED`, timeouts).
   - Marks server reachability as false to trigger the offline ledger.
   - Automatically retries idempotent `GET` requests once after an 800ms backoff before propagating errors.
   - Transparently handles JWT token rotation upon `401 Unauthorized`.

---

## 2. Server Production Hardening

1. **Security Headers & Reverse Proxy Trust**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Strict-Transport-Security` (HSTS enabled in production)
   - `app.set('trust proxy', 1)` for SSL-terminating proxies (Nginx, Traefik, AWS ALB, Cloudflare).
2. **Graceful Shutdown & Signal Trapping**:
   - Traps `SIGTERM` and `SIGINT`.
   - Closes HTTP server connections, cleans up database connections via `prisma.$disconnect()`, and enforces a 10s timeout to prevent hanging zombie containers.
3. **Deep Health & Readiness Probes**:
   - `/health` and `/healthz`: Executes a live `SELECT 1` database query to verify DB availability, returning `200 OK` or `503 Service Unavailable`.
4. **Single-Port Unified SPA Serving**:
   - In production, Express automatically serves compiled frontend assets from `CLIENT_DIST_PATH` (`client/dist`) with SPA fallback for browser routing (`/*splat` fallback to `index.html`), allowing single-container deployment.

---

## 3. Deployment with Docker & Docker Compose (Recommended)

### Step 1: Prepare Environment File
Copy the production template:
```bash
cp .env.production.example .env
```
Ensure you set strong secrets:
- `JWT_SECRET` (at least 32 random characters)
- `JWT_REFRESH_SECRET` (at least 32 random characters)
- `POSTGRES_PASSWORD`

### Step 2: Build and Run Containerized Services
```bash
docker compose up -d --build
```
This launches:
- `injera_db`: PostgreSQL 16 Alpine with persistent volume `injera_pgdata` and internal healthcheck.
- `injera_app`: Multi-stage built Node 22 Alpine container running compiled backend and frontend on port `3000`.

### Step 3: Verify Container Health
```bash
docker compose ps
curl http://localhost:3000/healthz
```
Expected output:
```json
{
  "status": "ok",
  "uptime": 12,
  "timestamp": "2026-11-22T14:40:00.000Z",
  "services": {
    "database": "connected"
  }
}
```

---

## 4. Standalone Deployment (Linux VPS with Systemd & Nginx)

### Step 1: Install Dependencies & Build
```bash
# Build Client
cd client
pnpm install --frozen-lockfile
pnpm run build

# Build Server
cd ../server
pnpm install --frozen-lockfile
pnpm run db:generate
pnpm run db:deploy
pnpm run build
```

### Step 2: Configure Systemd Service
Create `/etc/systemd/system/injera.service`:
```ini
[Unit]
Description=Injera Commercial Bakery OS
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/injera/server
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
EnvironmentFile=/var/www/injera/.env

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable injera
sudo systemctl start injera
```

### Step 3: Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/injera.conf`:
```nginx
server {
    listen 80;
    server_name bakery.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bakery.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/bakery.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bakery.yourdomain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Node.js backend & SPA
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```
Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/injera.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
