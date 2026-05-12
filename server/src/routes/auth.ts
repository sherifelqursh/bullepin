import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db, type DbUser } from "../db.js";
import { hashPassword, verifyPassword, signToken } from "../auth.js";
import { publicUser, requireAuth, type Vars } from "../middleware.js";

const app = new Hono<{ Variables: Vars }>();

app.post("/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim() || identifier.split("@")[0] || "Friend";

  if (!identifier || !password) {
    return c.json({ error: "identifier and password required" }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: "password must be at least 6 characters" }, 400);
  }

  const isEmail = identifier.includes("@");
  const email = isEmail ? identifier.toLowerCase() : null;
  const phone = isEmail ? null : identifier;

  if (email) {
    const dup = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (dup) return c.json({ error: "email already registered" }, 409);
  }

  const id = nanoid(12);
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, email, phone, password_hash, name, avatar_url, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`
  ).run(id, email, phone, hashPassword(password), name, now);

  // Auto-accept any pending invitations targeting this email.
  if (email) {
    const invites = db
      .prepare(
        "SELECT id, circle_id FROM invitations WHERE invitee_email = ? AND status = 'pending'"
      )
      .all(email) as { id: string; circle_id: string }[];
    const link = db.prepare(
      "UPDATE invitations SET invitee_user_id = ? WHERE id = ?"
    );
    for (const inv of invites) link.run(id, inv.id);
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser;
  const token = signToken(id);
  return c.json({ token, user: publicUser(user) });
});

app.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");
  if (!identifier || !password) {
    return c.json({ error: "identifier and password required" }, 400);
  }
  const isEmail = identifier.includes("@");
  const user = db
    .prepare(
      isEmail
        ? "SELECT * FROM users WHERE email = ?"
        : "SELECT * FROM users WHERE phone = ?"
    )
    .get(isEmail ? identifier.toLowerCase() : identifier) as DbUser | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return c.json({ error: "invalid credentials" }, 401);
  }

  const token = signToken(user.id);
  return c.json({ token, user: publicUser(user) });
});

app.get("/me", requireAuth, (c) => {
  const u = c.get("user");
  return c.json({ user: publicUser(u) });
});

app.patch("/me", requireAuth, async (c) => {
  const u = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const name = body.name === undefined ? u.name : String(body.name).trim();
  const avatarUrl =
    body.avatarUrl === undefined ? u.avatar_url : body.avatarUrl;
  const phone = body.phone === undefined ? u.phone : String(body.phone).trim();
  db.prepare(
    "UPDATE users SET name = ?, avatar_url = ?, phone = ? WHERE id = ?"
  ).run(name, avatarUrl, phone, u.id);
  const fresh = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(u.id) as DbUser;
  return c.json({ user: publicUser(fresh) });
});

app.post("/me/password", requireAuth, async (c) => {
  const u = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const current = String(body.currentPassword ?? "");
  const next = String(body.newPassword ?? "");
  if (!verifyPassword(current, u.password_hash)) {
    return c.json({ error: "current password incorrect" }, 401);
  }
  if (next.length < 6) {
    return c.json({ error: "new password must be at least 6 characters" }, 400);
  }
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    hashPassword(next),
    u.id
  );
  return c.json({ ok: true });
});

export default app;
