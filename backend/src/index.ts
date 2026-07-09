import cors from "cors";
import express from "express";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";
import { groupsRouter } from "./routes/groups.js";
import { linksRouter } from "./routes/links.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

const allowedOrigins = [
  "http://localhost:3000",
  "https://linksavekren.vercel.app",
  ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ??
    []),
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.startsWith("chrome-extension://")) return callback(null, true);
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  const envErr = getDatabaseEnvError();
  if (envErr) {
    res.status(503).json({ ok: false, service: "linksavekren-api", error: envErr });
    return;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "linksavekren-api", db: "ok" });
  } catch (e) {
    console.error("GET /health:", e);
    res.status(503).json({ ok: false, service: "linksavekren-api", db: "error" });
  }
});

app.use("/api/groups", groupsRouter);
app.use("/api/links", linksRouter);

app.listen(port, () => {
  console.log(`linksavekren-api listening on port ${port}`);
});
