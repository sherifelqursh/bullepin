import { Hono } from "hono";
import { nanoid } from "nanoid";
import fs from "node:fs";
import path from "node:path";
import { db, type DbPin, dataDir } from "../db.js";
import { requireAuth, type Vars } from "../middleware.js";

const uploadsDir =
  process.env.BULLEPIN_UPLOADS_DIR ?? path.join(dataDir, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const app = new Hono<{ Variables: Vars }>();
app.use("*", requireAuth);

function isMember(circleId: string, userId: string) {
  return !!db
    .prepare(
      "SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?"
    )
    .get(circleId, userId);
}

function decodeAndStoreImage(dataUrl: string): string | null {
  const m = /^data:image\/([a-zA-Z0-9+-.]+);base64,(.*)$/.exec(dataUrl);
  if (!m) return null;
  const ext = m[1].toLowerCase().replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "") || "png";
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 4 * 1024 * 1024) return null; // 4MB cap
  const id = nanoid(16);
  const filename = `${id}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buf);
  return `/uploads/${filename}`;
}

function loadPin(pinId: string, viewerId: string) {
  const pin = db
    .prepare("SELECT * FROM pins WHERE id = ?")
    .get(pinId) as DbPin | undefined;
  if (!pin) return null;
  if (!isMember(pin.circle_id, viewerId)) return "forbidden" as const;
  const rsvps = db
    .prepare(
      `SELECT r.status, u.id, u.name, u.avatar_url
       FROM rsvps r JOIN users u ON u.id = r.user_id
       WHERE r.pin_id = ?`
    )
    .all(pinId) as Array<{
    status: "yes" | "no" | "maybe";
    id: string;
    name: string;
    avatar_url: string | null;
  }>;
  const mine = rsvps.find((r) => r.id === viewerId);
  const grouped = { yes: [] as any[], no: [] as any[], maybe: [] as any[] };
  for (const r of rsvps) {
    grouped[r.status].push({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatar_url,
      initials: r.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]!.toUpperCase())
        .join(""),
    });
  }
  const circle = db
    .prepare("SELECT name FROM circles WHERE id = ?")
    .get(pin.circle_id) as { name: string };
  const role = db
    .prepare(
      "SELECT role FROM circle_members WHERE circle_id = ? AND user_id = ?"
    )
    .get(pin.circle_id, viewerId) as { role: "Admin" | "Member" } | undefined;
  const canDelete =
    pin.creator_id === viewerId || role?.role === "Admin";
  return {
    id: pin.id,
    circleId: pin.circle_id,
    circleName: circle.name,
    creatorId: pin.creator_id,
    title: pin.title,
    notes: pin.notes,
    when: pin.when_text,
    where: pin.where_text,
    coverUrl: pin.cover_url,
    createdAt: pin.created_at,
    rsvp: mine?.status ?? null,
    rsvps: grouped,
    canDelete,
  };
}

// Board feed for a circle
app.get("/circle/:circleId", (c) => {
  const u = c.get("user");
  const circleId = c.req.param("circleId");
  if (!isMember(circleId, u.id)) return c.json({ error: "forbidden" }, 403);
  const rows = db
    .prepare(
      `SELECT p.*, COUNT(r.user_id) AS rsvp_count
       FROM pins p LEFT JOIN rsvps r ON r.pin_id = p.id
       WHERE p.circle_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    )
    .all(circleId) as Array<DbPin & { rsvp_count: number }>;
  const rsvpStmt = db.prepare(
    `SELECT r.status, u.id, u.name, u.avatar_url
     FROM rsvps r JOIN users u ON u.id = r.user_id
     WHERE r.pin_id = ?
     ORDER BY r.updated_at DESC`
  );
  return c.json({
    pins: rows.map((p) => {
      const rsvps = rsvpStmt.all(p.id) as Array<{
        status: "yes" | "no" | "maybe";
        id: string;
        name: string;
        avatar_url: string | null;
      }>;
      const grouped = { yes: [] as any[], no: [] as any[], maybe: [] as any[] };
      for (const r of rsvps) {
        grouped[r.status].push({
          id: r.id,
          name: r.name,
          avatarUrl: r.avatar_url,
          initials: r.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]!.toUpperCase())
            .join(""),
        });
      }
      return {
        id: p.id,
        title: p.title,
        when: p.when_text,
        where: p.where_text,
        coverUrl: p.cover_url,
        createdAt: p.created_at,
        rsvpCount: p.rsvp_count,
        rsvps: grouped,
      };
    }),
  });
});

// Create pin
app.post("/circle/:circleId", async (c) => {
  const u = c.get("user");
  const circleId = c.req.param("circleId");
  if (!isMember(circleId, u.id)) return c.json({ error: "forbidden" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) return c.json({ error: "title required" }, 400);
  const notes = body.notes ? String(body.notes) : null;
  const whenText = body.when ? String(body.when) : null;
  const whereText = body.where ? String(body.where) : null;
  let coverUrl: string | null = null;
  if (typeof body.coverDataUrl === "string" && body.coverDataUrl.startsWith("data:")) {
    coverUrl = decodeAndStoreImage(body.coverDataUrl);
  }
  const id = nanoid(12);
  db.prepare(
    `INSERT INTO pins (id, circle_id, creator_id, title, notes, when_text, where_text, cover_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, circleId, u.id, title, notes, whenText, whereText, coverUrl, Date.now());
  return c.json({ pin: loadPin(id, u.id) });
});

// Pin detail
app.get("/:id", (c) => {
  const u = c.get("user");
  const result = loadPin(c.req.param("id"), u.id);
  if (!result) return c.json({ error: "not found" }, 404);
  if (result === "forbidden") return c.json({ error: "forbidden" }, 403);
  return c.json({ pin: result });
});

// Delete a pin — pin creator OR a circle admin.
// Cascade deletes rsvps via FK; also unlinks the cover image.
app.delete("/:id", (c) => {
  const u = c.get("user");
  const pinId = c.req.param("id");
  const pin = db
    .prepare("SELECT * FROM pins WHERE id = ?")
    .get(pinId) as DbPin | undefined;
  if (!pin) return c.json({ error: "not found" }, 404);
  const role = db
    .prepare(
      "SELECT role FROM circle_members WHERE circle_id = ? AND user_id = ?"
    )
    .get(pin.circle_id, u.id) as { role: "Admin" | "Member" } | undefined;
  const canDelete = pin.creator_id === u.id || role?.role === "Admin";
  if (!canDelete) return c.json({ error: "forbidden" }, 403);

  if (pin.cover_url?.startsWith("/uploads/")) {
    const filename = pin.cover_url.replace(/^\/uploads\//, "");
    try {
      fs.unlinkSync(path.join(uploadsDir, filename));
    } catch {
      // ignore
    }
  }
  db.prepare("DELETE FROM pins WHERE id = ?").run(pinId);
  return c.json({ ok: true });
});

// RSVP
app.post("/:id/rsvp", async (c) => {
  const u = c.get("user");
  const pinId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const status = body.status;
  if (status !== "yes" && status !== "no" && status !== "maybe")
    return c.json({ error: "invalid status" }, 400);
  const pin = db
    .prepare("SELECT circle_id FROM pins WHERE id = ?")
    .get(pinId) as { circle_id: string } | undefined;
  if (!pin) return c.json({ error: "not found" }, 404);
  if (!isMember(pin.circle_id, u.id))
    return c.json({ error: "forbidden" }, 403);
  db.prepare(
    `INSERT INTO rsvps (pin_id, user_id, status, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(pin_id, user_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`
  ).run(pinId, u.id, status, Date.now());
  return c.json({ pin: loadPin(pinId, u.id) });
});

// Avatar upload (returns hosted URL)
app.post("/upload/avatar", async (c) => {
  const u = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const dataUrl = String(body.dataUrl ?? "");
  const url = decodeAndStoreImage(dataUrl);
  if (!url) return c.json({ error: "invalid image" }, 400);
  db.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(url, u.id);
  return c.json({ avatarUrl: url });
});

export default app;
