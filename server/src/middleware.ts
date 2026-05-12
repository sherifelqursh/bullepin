import { createMiddleware } from "hono/factory";
import { verifyToken } from "./auth.js";
import { db, type DbUser } from "./db.js";

export type Vars = { user: DbUser };

export const requireAuth = createMiddleware<{ Variables: Vars }>(
  async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return c.json({ error: "missing token" }, 401);
    const userId = verifyToken(token);
    if (!userId) return c.json({ error: "invalid token" }, 401);
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as DbUser | undefined;
    if (!user) return c.json({ error: "user not found" }, 401);
    c.set("user", user);
    await next();
  }
);

export function publicUser(u: DbUser) {
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.name,
    avatarUrl: u.avatar_url,
  };
}
