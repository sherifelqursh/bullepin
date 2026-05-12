import { Hono } from "hono";
import { nanoid } from "nanoid";
import fs from "node:fs";
import path from "node:path";
import { db, type DbCircle, dataDir } from "../db.js";
import { requireAuth, type Vars } from "../middleware.js";

const uploadsDir =
  process.env.BULLEPIN_UPLOADS_DIR ?? path.join(dataDir, "uploads");

const app = new Hono<{ Variables: Vars }>();

app.use("*", requireAuth);

type PreviewMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type CircleSummary = {
  id: string;
  name: string;
  blurb: string | null;
  icon: string;
  ownerId: string;
  role: "Admin" | "Member";
  memberCount: number;
  pinCount: number;
  joined: boolean;
  previewMembers: PreviewMember[];
};

function loadSummary(circleId: string, userId: string): CircleSummary | null {
  const circle = db
    .prepare("SELECT * FROM circles WHERE id = ?")
    .get(circleId) as DbCircle | undefined;
  if (!circle) return null;
  const member = db
    .prepare(
      "SELECT role FROM circle_members WHERE circle_id = ? AND user_id = ?"
    )
    .get(circleId, userId) as { role: "Admin" | "Member" } | undefined;
  const memberCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM circle_members WHERE circle_id = ?")
      .get(circleId) as { c: number }
  ).c;
  const pinCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM pins WHERE circle_id = ?")
      .get(circleId) as { c: number }
  ).c;
  const previewRows = db
    .prepare(
      `SELECT u.id, u.name, u.avatar_url
       FROM circle_members m JOIN users u ON u.id = m.user_id
       WHERE m.circle_id = ?
       ORDER BY (u.id = ?) DESC, (m.role = 'Admin') DESC, m.joined_at DESC
       LIMIT 3`
    )
    .all(circleId, userId) as Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }>;
  return {
    id: circle.id,
    name: circle.name,
    blurb: circle.blurb,
    icon: circle.icon,
    ownerId: circle.owner_id,
    role: member?.role ?? "Member",
    memberCount,
    pinCount,
    joined: !!member,
    previewMembers: previewRows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatar_url,
    })),
  };
}

// List circles the user belongs to
app.get("/", (c) => {
  const u = c.get("user");
  const rows = db
    .prepare(
      `SELECT c.* FROM circles c
       JOIN circle_members m ON m.circle_id = c.id
       WHERE m.user_id = ?
       ORDER BY c.created_at DESC`
    )
    .all(u.id) as DbCircle[];
  const circles = rows
    .map((r) => loadSummary(r.id, u.id))
    .filter((x): x is CircleSummary => !!x);

  // Pending invitations addressed to this user
  const invites = db
    .prepare(
      `SELECT i.id AS id, i.circle_id, c.name AS circle_name, i.created_at, u.name AS inviter_name
       FROM invitations i
       JOIN circles c ON c.id = i.circle_id
       JOIN users u ON u.id = i.inviter_id
       WHERE (i.invitee_user_id = ? OR i.invitee_email = ?)
         AND i.status = 'pending'
       ORDER BY i.created_at DESC`
    )
    .all(u.id, u.email ?? "__none__") as Array<{
    id: string;
    circle_id: string;
    circle_name: string;
    created_at: number;
    inviter_name: string;
  }>;

  return c.json({
    circles,
    invitations: invites.map((i) => ({
      id: i.id,
      circleId: i.circle_id,
      circleName: i.circle_name,
      inviterName: i.inviter_name,
      createdAt: i.created_at,
    })),
  });
});

// Create a circle (creator becomes Admin)
app.post("/", async (c) => {
  const u = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const blurb = body.blurb ? String(body.blurb).trim() : null;
  const icon = ["art", "chat", "camera"].includes(body.icon) ? body.icon : "art";
  if (!name) return c.json({ error: "name required" }, 400);
  const id = nanoid(10);
  const now = Date.now();
  db.prepare(
    `INSERT INTO circles (id, name, blurb, icon, owner_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name, blurb, icon, u.id, now);
  db.prepare(
    `INSERT INTO circle_members (circle_id, user_id, role, joined_at)
     VALUES (?, ?, 'Admin', ?)`
  ).run(id, u.id, now);
  return c.json({ circle: loadSummary(id, u.id) });
});

// Get circle details + members
app.get("/:id", (c) => {
  const u = c.get("user");
  const id = c.req.param("id");
  const summary = loadSummary(id, u.id);
  if (!summary) return c.json({ error: "circle not found" }, 404);
  if (!summary.joined) return c.json({ error: "not a member" }, 403);

  const members = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.avatar_url, m.role
       FROM circle_members m JOIN users u ON u.id = m.user_id
       WHERE m.circle_id = ?
       ORDER BY (m.role = 'Admin') DESC, u.name ASC`
    )
    .all(id) as Array<{
    id: string;
    name: string;
    email: string | null;
    avatar_url: string | null;
    role: "Admin" | "Member";
  }>;
  return c.json({
    circle: summary,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      avatarUrl: m.avatar_url,
      role: m.role,
      isYou: m.id === u.id,
    })),
  });
});

// Update circle name (admin only)
app.patch("/:id", async (c) => {
  const u = c.get("user");
  const id = c.req.param("id");
  const summary = loadSummary(id, u.id);
  if (!summary) return c.json({ error: "circle not found" }, 404);
  if (summary.role !== "Admin")
    return c.json({ error: "admins only" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const name = body.name ? String(body.name).trim() : undefined;
  const blurb = body.blurb !== undefined ? String(body.blurb) : undefined;
  if (!name && blurb === undefined)
    return c.json({ error: "nothing to update" }, 400);
  if (name) db.prepare("UPDATE circles SET name = ? WHERE id = ?").run(name, id);
  if (blurb !== undefined)
    db.prepare("UPDATE circles SET blurb = ? WHERE id = ?").run(blurb, id);
  return c.json({ circle: loadSummary(id, u.id) });
});

// Invite a user by email (admin only)
app.post("/:id/invite", async (c) => {
  const u = c.get("user");
  const id = c.req.param("id");
  const summary = loadSummary(id, u.id);
  if (!summary || summary.role !== "Admin")
    return c.json({ error: "admins only" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return c.json({ error: "email required" }, 400);

  const existingUser = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as { id: string } | undefined;

  if (existingUser) {
    const alreadyMember = db
      .prepare(
        "SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?"
      )
      .get(id, existingUser.id);
    if (alreadyMember) return c.json({ error: "already a member" }, 409);
  }

  const dup = db
    .prepare(
      "SELECT id FROM invitations WHERE circle_id = ? AND invitee_email = ? AND status = 'pending'"
    )
    .get(id, email);
  if (dup) return c.json({ error: "invitation already pending" }, 409);

  const inviteId = nanoid(12);
  db.prepare(
    `INSERT INTO invitations (id, circle_id, inviter_id, invitee_email, invitee_user_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).run(inviteId, id, u.id, email, existingUser?.id ?? null, Date.now());
  return c.json({ ok: true, id: inviteId });
});

// Accept / decline an invitation
app.post("/invitations/:invId/respond", async (c) => {
  const u = c.get("user");
  const invId = c.req.param("invId");
  const body = await c.req.json().catch(() => ({}));
  const action = body.action;
  if (action !== "accept" && action !== "decline")
    return c.json({ error: "invalid action" }, 400);
  const inv = db
    .prepare("SELECT * FROM invitations WHERE id = ?")
    .get(invId) as
    | {
        id: string;
        circle_id: string;
        invitee_user_id: string | null;
        invitee_email: string;
        status: string;
      }
    | undefined;
  if (!inv) return c.json({ error: "not found" }, 404);
  const targetsMe =
    inv.invitee_user_id === u.id ||
    (u.email && inv.invitee_email === u.email.toLowerCase());
  if (!targetsMe) return c.json({ error: "not yours" }, 403);
  if (inv.status !== "pending")
    return c.json({ error: "already responded" }, 409);

  if (action === "decline") {
    db.prepare(
      "UPDATE invitations SET status = 'declined' WHERE id = ?"
    ).run(invId);
    return c.json({ ok: true });
  }

  db.prepare(
    "UPDATE invitations SET status = 'accepted', invitee_user_id = ? WHERE id = ?"
  ).run(u.id, invId);
  const exists = db
    .prepare(
      "SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?"
    )
    .get(inv.circle_id, u.id);
  if (!exists) {
    db.prepare(
      `INSERT INTO circle_members (circle_id, user_id, role, joined_at)
       VALUES (?, ?, 'Member', ?)`
    ).run(inv.circle_id, u.id, Date.now());
  }
  return c.json({ ok: true, circleId: inv.circle_id });
});

// Permanently delete a circle (admins only).
// Cascades members/invites/pins/rsvps via FK; also unlinks any uploaded
// cover photos from disk.
app.delete("/:id", (c) => {
  const u = c.get("user");
  const id = c.req.param("id");
  const summary = loadSummary(id, u.id);
  if (!summary) return c.json({ error: "circle not found" }, 404);
  if (summary.role !== "Admin")
    return c.json({ error: "admins only" }, 403);

  // Collect cover-image paths so we can clean up files after the DB delete.
  const covers = (
    db
      .prepare(
        "SELECT cover_url FROM pins WHERE circle_id = ? AND cover_url IS NOT NULL"
      )
      .all(id) as { cover_url: string }[]
  ).map((r) => r.cover_url);

  db.prepare("DELETE FROM circles WHERE id = ?").run(id);

  // Best-effort file cleanup.
  for (const url of covers) {
    if (!url.startsWith("/uploads/")) continue;
    const filename = url.replace(/^\/uploads\//, "");
    try {
      fs.unlinkSync(path.join(uploadsDir, filename));
    } catch {
      // ignore — orphaned files aren't fatal
    }
  }

  return c.json({ ok: true });
});

// Drop the user's circle membership AND every RSVP they left
// on this circle's pins — so they don't haunt the board after exit.
function evictFromCircle(circleId: string, userId: string) {
  db.prepare(
    `DELETE FROM rsvps
     WHERE user_id = ?
       AND pin_id IN (SELECT id FROM pins WHERE circle_id = ?)`
  ).run(userId, circleId);
  db.prepare(
    "DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?"
  ).run(circleId, userId);
}

// Leave circle (non-owner)
app.post("/:id/leave", (c) => {
  const u = c.get("user");
  const id = c.req.param("id");
  const summary = loadSummary(id, u.id);
  if (!summary) return c.json({ error: "circle not found" }, 404);
  if (summary.ownerId === u.id)
    return c.json({ error: "owner cannot leave" }, 400);
  evictFromCircle(id, u.id);
  return c.json({ ok: true });
});

// Promote / demote / kick (admin only, can't touch owner)
app.post("/:id/members/:userId/role", async (c) => {
  const u = c.get("user");
  const id = c.req.param("id");
  const targetId = c.req.param("userId");
  const summary = loadSummary(id, u.id);
  if (!summary || summary.role !== "Admin")
    return c.json({ error: "admins only" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const role = body.role;
  if (role !== "Admin" && role !== "Member")
    return c.json({ error: "invalid role" }, 400);
  if (summary.ownerId === targetId && role !== "Admin")
    return c.json({ error: "cannot demote owner" }, 400);
  db.prepare(
    "UPDATE circle_members SET role = ? WHERE circle_id = ? AND user_id = ?"
  ).run(role, id, targetId);
  return c.json({ ok: true });
});

app.delete("/:id/members/:userId", (c) => {
  const u = c.get("user");
  const id = c.req.param("id");
  const targetId = c.req.param("userId");
  const summary = loadSummary(id, u.id);
  if (!summary || summary.role !== "Admin")
    return c.json({ error: "admins only" }, 403);
  if (summary.ownerId === targetId)
    return c.json({ error: "cannot remove owner" }, 400);
  evictFromCircle(id, targetId);
  return c.json({ ok: true });
});

export default app;
