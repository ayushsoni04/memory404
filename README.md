# Not a Bookmark

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Production

- **Frontend (Vercel):** [https://linksavekren.vercel.app](https://linksavekren.vercel.app)
- **Backend (Render):** Express API in `backend/` — see [Render setup](#backend-render) below

Set `NEXT_PUBLIC_API_URL` on Vercel to your Render service URL (e.g. `https://linksavekren-api.onrender.com`) so the frontend and extension talk to Render instead of Next.js `/api` routes.

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

Env vars on Render: `DATABASE_URL`, `DIRECT_URL`, optional `CORS_ORIGINS=https://linksavekren.vercel.app`

Local split-stack dev: run `npm run dev` (frontend) and `cd backend && npm run dev` (API), with `NEXT_PUBLIC_API_URL=http://localhost:4000` in `.env.local`.

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
