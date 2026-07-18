import compression from "compression";
import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import {
  closeMongo,
  ensureMongoIndexes,
  getMongoEnvError,
  pingMongo,
} from "@/lib/db/mongodb";
import { groupsRouter } from "./routes/groups.js";
import { linksRouter } from "./routes/links.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const isDev = process.env.NODE_ENV !== "production";

// ─── Trust Render / Vercel proxy (correct IP for rate-limiting) ─────────────
app.set("trust proxy", 1);

// ─── Gzip compression (skip already-compressed content-types) ───────────────
app.use(
  compression({
    // Only compress responses above 1 KB
    threshold: 1024,
    filter(req, res) {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "https://memory404.vercel.app",
  ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
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

// ─── Rate limiting ───────────────────────────────────────────────────────────
// Global limiter: 300 req / 1 min per IP (protects all routes)
app.use(
  rateLimit({
    windowMs: 60 * 1_000,
    max: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests, please slow down." },
    skip: () => isDev, // disable in local dev
  }),
);

// Write limiter: 30 req / 1 min per IP on mutation endpoints
const writeLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many write requests, please slow down." },
  skip: () => isDev,
});

// ─── Request timeout middleware (abort at 30 s) ──────────────────────────────
function requestTimeout(ms: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({ error: "Request timed out." });
      }
    }, ms);
    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  };
}
app.use(requestTimeout(30_000));

// ─── Body parser ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  const envErr = getMongoEnvError();
  if (envErr) {
    res.status(503).json({ ok: false, service: "memory404-api", error: envErr });
    return;
  }
  try {
    await pingMongo();
    res.json({
      ok: true,
      service: "memory404-api",
      db: "ok",
      uptime: process.uptime(),
    });
  } catch (e) {
    console.error("GET /health:", e);
    res.status(503).json({ ok: false, service: "memory404-api", db: "error" });
  }
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api/groups", groupsRouter);
app.use("/api/links", writeLimiter, linksRouter);

// ─── 404 catch-all ───────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[unhandled]", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
const server = app.listen(port, () => {
  console.log(`memory404-api listening on port ${port} (${process.env.NODE_ENV ?? "development"})`);
});

if (!getMongoEnvError()) {
  void ensureMongoIndexes().catch((error) => {
    console.error("Failed to ensure MongoDB indexes:", error);
  });
}

// ─── Graceful shutdown (Render sends SIGTERM before killing the process) ──────
async function shutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully…`);
  server.close(async () => {
    try {
      await closeMongo();
      console.log("MongoDB disconnected. Bye!");
    } catch (e) {
      console.error("Error disconnecting MongoDB:", e);
    }
    process.exit(0);
  });

  // Force-exit if graceful shutdown takes > 10 s
  setTimeout(() => {
    console.error("Graceful shutdown timed out. Force exiting.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
process.on("SIGINT", () => { void shutdown("SIGINT"); });
