import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.BULLEPIN_JWT_SECRET || "dev-secret-change-me";

export function hashPassword(plain: string) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, SECRET) as { sub?: string };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}
