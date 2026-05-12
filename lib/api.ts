import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
  writeBatch,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// Hard cap so a single Firestore doc stays well under the 1 MiB limit.
// expo-image-picker with quality 0.4 + aspect crop yields ~30-150 KB images,
// so 700 KB is a safe ceiling.
const MAX_IMAGE_BYTES = 700 * 1024;

// Small id helper — Firestore lets us pass our own doc IDs.
function nid(len = 12) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++)
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function uid() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  return u.uid;
}

function tsToMs(t: unknown): number {
  if (t instanceof Timestamp) return t.toMillis();
  if (typeof t === "number") return t;
  return Date.now();
}

// ---------- Public types ---------------------------------------------------
export type PublicUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  avatarUrl: string | null;
};

export type PreviewMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type CircleSummary = {
  id: string;
  name: string;
  blurb: string | null;
  icon: "art" | "chat" | "camera";
  ownerId: string;
  role: "Admin" | "Member";
  memberCount: number;
  pinCount: number;
  joined: boolean;
  previewMembers: PreviewMember[];
};

export type Invitation = {
  id: string;
  circleId: string;
  circleName: string;
  inviterName: string;
  createdAt: number;
};

export type CircleMember = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: "Admin" | "Member";
  isYou: boolean;
};

export type RsvpStatus = "yes" | "no" | "maybe";

export type RsvpEntry = {
  id: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
};

export type PinSummary = {
  id: string;
  title: string;
  when: string | null;
  where: string | null;
  coverUrl: string | null;
  createdAt: number;
  rsvpCount: number;
  rsvps: { yes: RsvpEntry[]; no: RsvpEntry[]; maybe: RsvpEntry[] };
};

export type PinDetail = PinSummary & {
  circleId: string;
  circleName: string;
  creatorId: string;
  notes: string | null;
  rsvp: RsvpStatus | null;
  canDelete: boolean;
};

// ---------- Helpers --------------------------------------------------------

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

type CachedProfile = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

// In-memory cache so the same user isn't refetched on every screen.
// Cleared on signOut() so a new login doesn't see stale entries.
const profileCache = new Map<string, CachedProfile>();
const profileInflight = new Map<string, Promise<CachedProfile | null>>();

export function clearProfileCache() {
  profileCache.clear();
  profileInflight.clear();
}

async function loadUser(userId: string): Promise<CachedProfile | null> {
  if (!userId) return null;
  const cached = profileCache.get(userId);
  if (cached) return cached;
  const inflight = profileInflight.get(userId);
  if (inflight) return inflight;
  const p = (async () => {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const profile: CachedProfile = {
      id: userId,
      name: (data.name as string) ?? "Friend",
      email: (data.email as string | null) ?? null,
      avatarUrl: (data.avatarUrl as string | null) ?? null,
    };
    profileCache.set(userId, profile);
    return profile;
  })().finally(() => profileInflight.delete(userId));
  profileInflight.set(userId, p);
  return p;
}

async function loadUsersByIds(ids: string[]) {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  const results = await Promise.all(unique.map((id) => loadUser(id)));
  const map = new Map<string, CachedProfile>();
  for (const r of results) if (r) map.set(r.id, r);
  return map;
}

async function getMemberRole(
  circleId: string,
  userId: string
): Promise<"Admin" | "Member" | null> {
  const snap = await getDoc(
    doc(db, "circles", circleId, "members", userId)
  );
  if (!snap.exists()) return null;
  return (snap.data().role as "Admin" | "Member") ?? "Member";
}

async function loadCircleSummary(
  circleId: string,
  viewerId: string
): Promise<CircleSummary | null> {
  // Run the three independent reads in parallel.
  const [cSnap, membersSnap, pinsSnap] = await Promise.all([
    getDoc(doc(db, "circles", circleId)),
    getDocs(collection(db, "circles", circleId, "members")),
    getDocs(collection(db, "circles", circleId, "pins")),
  ]);
  if (!cSnap.exists()) return null;
  const c = cSnap.data();

  const memberCount = membersSnap.size;
  const myMember = membersSnap.docs.find((d) => d.id === viewerId);

  // Pull profile for up to 3 preview members (viewer first).
  const memberIds = membersSnap.docs.map((d) => d.id);
  memberIds.sort((a, b) => (a === viewerId ? -1 : b === viewerId ? 1 : 0));
  const previewIds = memberIds.slice(0, 3);
  const profileMap = await loadUsersByIds(previewIds);
  const previewMembers: PreviewMember[] = previewIds.map((id) => {
    const u = profileMap.get(id);
    return {
      id,
      name: u?.name ?? "Friend",
      avatarUrl: u?.avatarUrl ?? null,
    };
  });

  return {
    id: circleId,
    name: (c.name as string) ?? "Circle",
    blurb: (c.blurb as string | null) ?? null,
    icon: (c.icon as "art" | "chat" | "camera") ?? "art",
    ownerId: (c.ownerId as string) ?? "",
    role: (myMember?.data().role as "Admin" | "Member") ?? "Member",
    memberCount,
    pinCount: pinsSnap.size,
    joined: !!myMember,
    previewMembers,
  };
}

async function loadPinRsvps(circleId: string, pinId: string) {
  const snap = await getDocs(
    collection(db, "circles", circleId, "pins", pinId, "rsvps")
  );
  const grouped = { yes: [] as RsvpEntry[], no: [] as RsvpEntry[], maybe: [] as RsvpEntry[] };
  const userIds = snap.docs.map((d) => d.id);
  const profiles = await loadUsersByIds(userIds);
  let mine: RsvpStatus | null = null;
  const me = auth.currentUser?.uid;
  for (const d of snap.docs) {
    const status = d.data().status as RsvpStatus;
    if (!status || !grouped[status]) continue;
    const u = profiles.get(d.id);
    grouped[status].push({
      id: d.id,
      name: u?.name ?? "Friend",
      avatarUrl: u?.avatarUrl ?? null,
      initials: initialsOf(u?.name ?? "?"),
    });
    if (d.id === me) mine = status;
  }
  return { grouped, mine };
}

// ---------- API ------------------------------------------------------------

export const api = {
  // Auth-shaped helpers kept so the screens that import api.* still compile.
  // The real auth flow lives in lib/auth.tsx (Firebase Auth).
  me: async () => {
    const u = auth.currentUser;
    if (!u) throw new Error("Not signed in");
    const snap = await getDoc(doc(db, "users", u.uid));
    const d = snap.data() ?? {};
    return {
      user: {
        id: u.uid,
        email: (d.email as string | null) ?? u.email,
        phone: (d.phone as string | null) ?? null,
        name: (d.name as string) ?? u.displayName ?? "Friend",
        avatarUrl: (d.avatarUrl as string | null) ?? u.photoURL ?? null,
      } satisfies PublicUser,
    };
  },

  // ---- Circles list / create / read / update / delete --------------------
  listCircles: async () => {
    const me = uid();
    // Find every member doc for this user via a collection-group query.
    const memberDocs = await getDocs(
      query(collectionGroup(db, "members"), where("userId", "==", me))
    );
    const circleIds = memberDocs.docs.map((d) =>
      d.ref.parent.parent!.id
    );
    const circles = (
      await Promise.all(circleIds.map((id) => loadCircleSummary(id, me)))
    ).filter((c): c is CircleSummary => !!c);
    circles.sort((a, b) => a.name.localeCompare(b.name));

    // Pending invitations — only by inviteeUserId. (Invitations to
    // an email address get linked to a uid at invite-time when the
    // user already exists.)
    const invByUid = await getDocs(
      query(
        collectionGroup(db, "invitations"),
        where("inviteeUserId", "==", me),
        where("status", "==", "pending")
      )
    );
    const invitations: Invitation[] = [];
    for (const d of invByUid.docs) {
      const data = d.data();
      const circleId = d.ref.parent.parent!.id;
      // Load circle + inviter names.
      const cSnap = await getDoc(doc(db, "circles", circleId));
      const inviter = await loadUser((data.inviterId as string) ?? "");
      invitations.push({
        id: d.id,
        circleId,
        circleName: (cSnap.data()?.name as string) ?? "Circle",
        inviterName: inviter?.name ?? "Someone",
        createdAt: tsToMs(data.createdAt),
      });
    }
    invitations.sort((a, b) => b.createdAt - a.createdAt);
    return { circles, invitations };
  },

  createCircle: async (
    name: string,
    blurb?: string,
    icon: "art" | "chat" | "camera" = "art"
  ) => {
    const me = uid();
    const cid = nid(10);
    const now = Date.now();
    const batch = writeBatch(db);
    batch.set(doc(db, "circles", cid), {
      name,
      blurb: blurb ?? null,
      icon,
      ownerId: me,
      createdAt: now,
    });
    batch.set(doc(db, "circles", cid, "members", me), {
      userId: me,
      role: "Admin",
      joinedAt: now,
    });
    await batch.commit();
    const circle = await loadCircleSummary(cid, me);
    return { circle: circle! };
  },

  getCircle: async (id: string) => {
    const me = uid();
    const summary = await loadCircleSummary(id, me);
    if (!summary) throw new Error("circle not found");
    if (!summary.joined) throw new Error("not a member");

    const membersSnap = await getDocs(
      collection(db, "circles", id, "members")
    );
    const memberIds = membersSnap.docs.map((d) => d.id);
    const profiles = await loadUsersByIds(memberIds);
    const members: CircleMember[] = membersSnap.docs
      .map((d) => {
        const role = (d.data().role as "Admin" | "Member") ?? "Member";
        const p = profiles.get(d.id);
        return {
          id: d.id,
          name: p?.name ?? "Friend",
          email: p?.email ?? null,
          avatarUrl: p?.avatarUrl ?? null,
          role,
          isYou: d.id === me,
        };
      })
      .sort((a, b) => {
        if ((a.role === "Admin") !== (b.role === "Admin"))
          return a.role === "Admin" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return { circle: summary, members };
  },

  updateCircle: async (id: string, patch: { name?: string; blurb?: string }) => {
    const me = uid();
    if ((await getMemberRole(id, me)) !== "Admin")
      throw new Error("admins only");
    const update: DocumentData = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.blurb !== undefined) update.blurb = patch.blurb;
    await updateDoc(doc(db, "circles", id), update);
    const summary = await loadCircleSummary(id, me);
    return { circle: summary! };
  },

  deleteCircle: async (id: string) => {
    const me = uid();
    if ((await getMemberRole(id, me)) !== "Admin")
      throw new Error("admins only");

    // Walk and delete every subcollection. (Firestore has no FK cascade.)
    const [pinsSnap, membersSnap, invitesSnap] = await Promise.all([
      getDocs(collection(db, "circles", id, "pins")),
      getDocs(collection(db, "circles", id, "members")),
      getDocs(collection(db, "circles", id, "invitations")),
    ]);

    const batches: Promise<void>[] = [];

    // For each pin, delete its rsvps then the pin and its cover image.
    for (const pinDoc of pinsSnap.docs) {
      const pinId = pinDoc.id;
      const rsvpsSnap = await getDocs(
        collection(db, "circles", id, "pins", pinId, "rsvps")
      );
      const b = writeBatch(db);
      for (const r of rsvpsSnap.docs) b.delete(r.ref);
      b.delete(pinDoc.ref);
      batches.push(b.commit());
      // Cover image lives inside the pin doc (base64) — deleted with it.
    }
    const memberBatch = writeBatch(db);
    membersSnap.docs.forEach((d) => memberBatch.delete(d.ref));
    invitesSnap.docs.forEach((d) => memberBatch.delete(d.ref));
    memberBatch.delete(doc(db, "circles", id));
    batches.push(memberBatch.commit());

    await Promise.all(batches);
    return { ok: true as const };
  },

  // ---- Membership / invites ----------------------------------------------
  invite: async (circleId: string, email: string) => {
    const me = uid();
    if ((await getMemberRole(circleId, me)) !== "Admin")
      throw new Error("admins only");
    const lowered = email.trim().toLowerCase();
    if (!lowered) throw new Error("email required");

    // If user with that email exists, link the uid for fast lookup.
    const usersByEmail = await getDocs(
      query(collection(db, "users"), where("email", "==", lowered), fbLimit(1))
    );
    const existingUid = usersByEmail.docs[0]?.id ?? null;

    if (existingUid) {
      const alreadyMember = await getDoc(
        doc(db, "circles", circleId, "members", existingUid)
      );
      if (alreadyMember.exists()) throw new Error("already a member");
    }
    // Avoid duplicate pending invites for the same email.
    const dup = await getDocs(
      query(
        collection(db, "circles", circleId, "invitations"),
        where("inviteeEmail", "==", lowered),
        where("status", "==", "pending"),
        fbLimit(1)
      )
    );
    if (!dup.empty) throw new Error("invitation already pending");

    const inviteId = nid(12);
    await setDoc(
      doc(db, "circles", circleId, "invitations", inviteId),
      {
        circleId,
        inviterId: me,
        inviteeEmail: lowered,
        inviteeUserId: existingUid,
        status: "pending",
        createdAt: serverTimestamp(),
      }
    );
    return { ok: true as const, id: inviteId };
  },

  respondInvite: async (invId: string, action: "accept" | "decline") => {
    const me = uid();
    // Search invitations addressed to my uid (the only ones we can read
    // under the simplified rules).
    const found = await getDocs(
      query(
        collectionGroup(db, "invitations"),
        where("inviteeUserId", "==", me),
        where("status", "==", "pending")
      )
    );
    const inv = found.docs.find((d) => d.id === invId);
    if (!inv) throw new Error("not found");
    const data = inv.data();
    if (data.inviteeUserId !== me) throw new Error("not yours");

    const circleId = inv.ref.parent.parent!.id;
    if (action === "decline") {
      await updateDoc(inv.ref, { status: "declined" });
      return { ok: true as const };
    }
    const batch = writeBatch(db);
    batch.update(inv.ref, { status: "accepted", inviteeUserId: me });
    const memberRef = doc(db, "circles", circleId, "members", me);
    batch.set(memberRef, { userId: me, role: "Member", joinedAt: Date.now() });
    await batch.commit();
    return { ok: true as const, circleId };
  },

  leaveCircle: async (id: string) => {
    const me = uid();
    const summary = await loadCircleSummary(id, me);
    if (!summary) throw new Error("circle not found");
    if (summary.ownerId === me) throw new Error("owner cannot leave");
    await evictMember(id, me);
    return { ok: true as const };
  },

  setMemberRole: async (
    id: string,
    userId: string,
    role: "Admin" | "Member"
  ) => {
    const me = uid();
    if ((await getMemberRole(id, me)) !== "Admin")
      throw new Error("admins only");
    const summary = await loadCircleSummary(id, me);
    if (summary?.ownerId === userId && role !== "Admin")
      throw new Error("cannot demote owner");
    await updateDoc(doc(db, "circles", id, "members", userId), { role });
    return { ok: true as const };
  },

  removeMember: async (id: string, userId: string) => {
    const me = uid();
    if ((await getMemberRole(id, me)) !== "Admin")
      throw new Error("admins only");
    const summary = await loadCircleSummary(id, me);
    if (summary?.ownerId === userId) throw new Error("cannot remove owner");
    await evictMember(id, userId);
    return { ok: true as const };
  },

  // ---- Pins / board / RSVP -----------------------------------------------
  boardForCircle: async (circleId: string) => {
    const me = uid();
    if (!(await getMemberRole(circleId, me)))
      throw new Error("forbidden");
    const pinsSnap = await getDocs(
      query(
        collection(db, "circles", circleId, "pins"),
        orderBy("createdAt", "desc")
      )
    );
    const pins: PinSummary[] = await Promise.all(
      pinsSnap.docs.map(async (d) => {
        const data = d.data();
        const { grouped } = await loadPinRsvps(circleId, d.id);
        const rsvpCount =
          grouped.yes.length + grouped.no.length + grouped.maybe.length;
        return {
          id: d.id,
          title: (data.title as string) ?? "",
          when: (data.whenText as string | null) ?? null,
          where: (data.whereText as string | null) ?? null,
          coverUrl: (data.coverUrl as string | null) ?? null,
          createdAt: tsToMs(data.createdAt),
          rsvpCount,
          rsvps: grouped,
        };
      })
    );
    return { pins };
  },

  createPin: async (
    circleId: string,
    body: {
      title: string;
      notes?: string;
      when?: string;
      where?: string;
      coverDataUrl?: string;
    }
  ) => {
    const me = uid();
    if (!(await getMemberRole(circleId, me)))
      throw new Error("forbidden");
    let coverUrl: string | null = null;
    if (body.coverDataUrl?.startsWith("data:")) {
      coverUrl = checkInlineImage(body.coverDataUrl);
    }
    const pinId = nid(12);
    await setDoc(doc(db, "circles", circleId, "pins", pinId), {
      circleId,
      creatorId: me,
      title: body.title,
      notes: body.notes ?? null,
      whenText: body.when ?? null,
      whereText: body.where ?? null,
      coverUrl,
      createdAt: serverTimestamp(),
    });
    const detail = await loadPinDetail(circleId, pinId, me);
    return { pin: detail };
  },

  getPin: async (pinId: string, knownCircleId?: string) => {
    const me = uid();
    const circleId = knownCircleId ?? (await findCircleForPin(me, pinId));
    const detail = await loadPinDetail(circleId, pinId, me);
    return { pin: detail };
  },

  rsvp: async (pinId: string, status: RsvpStatus, knownCircleId?: string) => {
    const me = uid();
    const circleId = knownCircleId ?? (await findCircleForPin(me, pinId));
    await setDoc(
      doc(db, "circles", circleId, "pins", pinId, "rsvps", me),
      { userId: me, status, updatedAt: serverTimestamp() }
    );
    const detail = await loadPinDetail(circleId, pinId, me);
    return { pin: detail };
  },

  deletePin: async (pinId: string, knownCircleId?: string) => {
    const me = uid();
    const circleId = knownCircleId ?? (await findCircleForPin(me, pinId));
    const pinRef = doc(db, "circles", circleId, "pins", pinId);
    const pinSnap = await getDoc(pinRef);
    if (!pinSnap.exists()) throw new Error("not found");
    const data = pinSnap.data();
    const role = await getMemberRole(circleId, me);
    if (!(data.creatorId === me || role === "Admin"))
      throw new Error("forbidden");
    const rsvpsSnap = await getDocs(
      collection(db, "circles", circleId, "pins", pinId, "rsvps")
    );
    const batch = writeBatch(db);
    rsvpsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(pinRef);
    await batch.commit();
    // Cover image is inline in the pin doc, deleted with it.
    return { ok: true as const };
  },

  // ---- Avatar upload -----------------------------------------------------
  uploadAvatar: async (dataUrl: string) => {
    const me = uid();
    const url = checkInlineImage(dataUrl);
    await updateDoc(doc(db, "users", me), { avatarUrl: url });
    return { avatarUrl: url };
  },
};

// ---------- Internal helpers ----------------------------------------------

async function findCircleForPin(userId: string, pinId: string): Promise<string> {
  // Walk the user's own circles only — cheap because users belong to few circles.
  const memberDocs = await getDocs(
    query(collectionGroup(db, "members"), where("userId", "==", userId))
  );
  for (const m of memberDocs.docs) {
    const cid = m.ref.parent.parent!.id;
    const pinSnap = await getDoc(doc(db, "circles", cid, "pins", pinId));
    if (pinSnap.exists()) return cid;
  }
  throw new Error("not found");
}

async function evictMember(circleId: string, userId: string) {
  // Strip every RSVP this user left on this circle's pins, then remove them.
  const pinsSnap = await getDocs(collection(db, "circles", circleId, "pins"));
  const batches: Promise<void>[] = [];
  for (const p of pinsSnap.docs) {
    batches.push(
      deleteDoc(
        doc(db, "circles", circleId, "pins", p.id, "rsvps", userId)
      ).catch(() => {})
    );
  }
  batches.push(deleteDoc(doc(db, "circles", circleId, "members", userId)));
  await Promise.all(batches);
}

async function loadPinDetail(
  circleId: string,
  pinId: string,
  viewerId: string
): Promise<PinDetail> {
  const [pinSnap, cSnap, rsvpInfo] = await Promise.all([
    getDoc(doc(db, "circles", circleId, "pins", pinId)),
    getDoc(doc(db, "circles", circleId)),
    loadPinRsvps(circleId, pinId),
  ]);
  if (!pinSnap.exists()) throw new Error("not found");
  const data = pinSnap.data();
  const role = await getMemberRole(circleId, viewerId);
  const canDelete = data.creatorId === viewerId || role === "Admin";
  return {
    id: pinId,
    circleId,
    circleName: (cSnap.data()?.name as string) ?? "Circle",
    creatorId: (data.creatorId as string) ?? "",
    title: (data.title as string) ?? "",
    notes: (data.notes as string | null) ?? null,
    when: (data.whenText as string | null) ?? null,
    where: (data.whereText as string | null) ?? null,
    coverUrl: (data.coverUrl as string | null) ?? null,
    createdAt: tsToMs(data.createdAt),
    rsvp: rsvpInfo.mine,
    rsvps: rsvpInfo.grouped,
    canDelete,
    rsvpCount:
      rsvpInfo.grouped.yes.length +
      rsvpInfo.grouped.no.length +
      rsvpInfo.grouped.maybe.length,
  };
}

function checkInlineImage(dataUrl: string) {
  const m = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("invalid image");
  // base64 inflates the byte count by ~33%, so check actual decoded size.
  const decodedBytes = Math.floor((m[2].length * 3) / 4);
  if (decodedBytes > MAX_IMAGE_BYTES) {
    throw new Error("image too large — try a smaller photo");
  }
  return dataUrl;
}
