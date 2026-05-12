import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dataDir =
  process.env.BULLEPIN_DATA_DIR || path.resolve(__dirname, "../../data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "bullepin.sqlite");
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS circles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blurb TEXT,
  icon TEXT NOT NULL DEFAULT 'art',
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS circle_members (
  circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('Admin','Member')),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pins (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  when_text TEXT,
  where_text TEXT,
  cover_url TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rsvps (
  pin_id TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('yes','no','maybe')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (pin_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pins_circle ON pins(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_invitee ON invitations(invitee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_email ON invitations(invitee_email, status);
CREATE INDEX IF NOT EXISTS idx_members_user ON circle_members(user_id);
`);

export type DbUser = {
  id: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
  name: string;
  avatar_url: string | null;
  created_at: number;
};

export type DbCircle = {
  id: string;
  name: string;
  blurb: string | null;
  icon: string;
  owner_id: string;
  created_at: number;
};

export type DbPin = {
  id: string;
  circle_id: string;
  creator_id: string;
  title: string;
  notes: string | null;
  when_text: string | null;
  where_text: string | null;
  cover_url: string | null;
  created_at: number;
};

export type DbInvitation = {
  id: string;
  circle_id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_user_id: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: number;
};
