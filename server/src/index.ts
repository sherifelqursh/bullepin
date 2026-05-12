import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";

import { dataDir } from "./db.js"; // ensure schema is initialized
import authRoutes from "./routes/auth.js";
import circleRoutes from "./routes/circles.js";
import pinRoutes from "./routes/pins.js";

const uploadsDir =
  process.env.BULLEPIN_UPLOADS_DIR ?? path.join(dataDir, "uploads");

// CORS: in production, set BULLEPIN_CORS_ORIGIN to a comma-separated allowlist
// (e.g. "https://bullepin.app,https://www.bullepin.app"). In dev, open to all.
const allowedOrigins = (process.env.BULLEPIN_CORS_ORIGIN ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = new Hono();
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (allowedOrigins.includes("*")) return origin ?? "*";
      if (!origin) return "*";
      return allowedOrigins.includes(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (c) => c.json({ ok: true, name: "bullepin", version: 1 }));

app.route("/auth", authRoutes);
app.route("/circles", circleRoutes);
app.route("/pins", pinRoutes);

app.use(
  "/uploads/*",
  serveStatic({
    root: path.relative(process.cwd(), uploadsDir),
    rewriteRequestPath: (p) => p.replace(/^\/uploads/, ""),
  })
);

const port = Number(process.env.PORT ?? 4001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`bullepin server listening on http://localhost:${info.port}`);
});
