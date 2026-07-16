# memory404 API (Render)

Express backend for `/api/groups` and `/api/links`. Shares Prisma schema and `lib/` with the Next.js frontend.

## Local

From repo root (with `.env` / `.env.local` containing `DATABASE_URL` and `DIRECT_URL`):

```bash
cd backend
npm install
npm run dev
```

API: `http://localhost:4000`  
Health: `GET /health`

Point the frontend at this server:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Deploy to Render

1. Push this repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → select repo (uses `render.yaml` at repo root).
3. Or **New Web Service** manually:
   - **Root Directory:** `backend`
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
   - **Health check path:** `/health`
4. Add env vars: `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGINS=https://memory404.vercel.app`
5. Copy the service URL (e.g. `https://memory404-api.onrender.com`).
6. On Vercel, set `NEXT_PUBLIC_API_URL` to that URL and redeploy.
7. In the Chrome extension settings (⚙), set **App URL** to the same Render URL.
