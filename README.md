# memory404

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Production

- **Frontend (Vercel):** [https://memory404.vercel.app](https://memory404.vercel.app)
- **Backend (Render):** Express API in `backend/` — see [Render setup](#backend-render) below

Set `NEXT_PUBLIC_API_URL` on Vercel to your Render service URL (e.g. `https://memory404-api.onrender.com`) so the frontend and extension talk to Render instead of Next.js `/api` routes.

Redeploy frontend:

```bash
npx vercel --prod
```

### Backend (Render)

```bash
cd backend
npm install
npm run dev   # http://localhost:4000
```

Deploy via [Render Dashboard](https://dashboard.render.com) → **New Blueprint** and point at this repo (`render.yaml`), or create a **Web Service** manually:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Health Check | `/health` |

Env vars on Render: `MONGODB_URI`, optional `MONGODB_DB=memory404`, and optional `CORS_ORIGINS=https://memory404.vercel.app`. Use a MongoDB Atlas connection string and keep it in the hosting provider's secret store.

Local split-stack dev: set `MONGODB_URI` (and optionally `MONGODB_DB`) in `.env.local`, run `npm run dev` (frontend) and `cd backend && npm run dev` (API), then set `NEXT_PUBLIC_API_URL=http://localhost:4000`.

### Persistence and authentication

memory404 uses the MongoDB native Node.js driver with MongoDB Atlas. Data is normalized into `users`, `groups`, and `links` collections with per-user uniqueness, relationship, soft-delete, and cursor-pagination indexes created by the Express startup path or migration script.

Supabase is used only for authentication and session refresh. It is not the application database. Configure its public URL and publishable key separately from `MONGODB_URI`.

### Keep-alive (free tier)

GitHub Actions [`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml) pings your services on a schedule:

| Service | Why | Schedule |
|---------|-----|----------|
| **Render** | Free web services sleep after ~15 min idle | Every 14 minutes |
| **Supabase Auth** | Auth health visibility | Daily |
| **Vercel** | Stays warm; avoids cold starts | Every 14 minutes |

Optional GitHub repo variables: `VERCEL_APP_URL`, `RENDER_API_URL`, `SUPABASE_PROJECT_URL` (your Auth project URL).

Trigger manually: **Actions → Keep services alive → Run workflow**.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
