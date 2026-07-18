# memory404 API (Render)

Express backend for `/api/groups` and `/api/links`. It shares the MongoDB native-driver repositories in `lib/db/` with the Next.js frontend.

## Local

From repo root, configure a MongoDB Atlas connection in `.env.local`:

```bash
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority"
MONGODB_DB="memory404"
```

Keep the real URI private. `MONGODB_DB` is optional and defaults to `memory404`.

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
4. Add `MONGODB_URI`, optional `MONGODB_DB=memory404`, and `CORS_ORIGINS=https://memory404.vercel.app`. Store `MONGODB_URI` as a secret.
5. Copy the service URL (e.g. `https://memory404-api.onrender.com`).
6. On Vercel, set `NEXT_PUBLIC_API_URL` to that URL and redeploy.
7. In the Chrome extension settings (⚙), set **App URL** to the same Render URL.

The API persists normalized `users`, `groups`, and `links` collections. The application creates the required unique, ownership, relationship, soft-delete, tag, and cursor-pagination indexes at startup. Supabase configuration is only for authentication; it is not used for API persistence.
