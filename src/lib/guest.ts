import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workerProfiles } from "@/db/schema";
import { getCurrentUser, type SessionUser } from "./auth";

export const CUSTOMER_COOKIE = "sahayi_customer";
export const WORKER_COOKIE = "sahayi_worker";

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function findUser(id: number) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const u = rows[0];
  if (!u) return null;
  return { id: u.id, name: u.name, phone: u.phone, role: u.role as "user" | "worker" } satisfies SessionUser;
}

/**
 * Customer identity without login.
 * - Honors an old logged-in session if one exists.
 * - Otherwise uses a per-device guest id stored in a cookie, creating one on demand.
 */
export async function getCustomer(): Promise<SessionUser> {
  try {
    const session = await getCurrentUser();
    if (session && session.role === "user") return session;
  } catch {
    // fall through to guest
  }
  const jar = await cookies();
  const raw = jar.get(CUSTOMER_COOKIE)?.value;
  if (raw) {
    const existing = await findUser(Number(raw)).catch(() => null);
    if (existing) return existing;
  }
  const [u] = await db
    .insert(users)
    .values({ name: "Guest", phone: randomId("guest-u"), passwordHash: "guest", role: "user" })
    .returning({ id: users.id, name: users.name, phone: users.phone, role: users.role });
  jar.set(CUSTOMER_COOKIE, String(u.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { id: u.id, name: u.name, phone: u.phone, role: u.role as "user" };
}

/**
 * Worker identity without login.
 * - Honors an old logged-in worker session if one exists.
 * - Otherwise uses a per-device guest worker id, creating profile row on demand.
 */
export async function getWorker(): Promise<SessionUser> {
  try {
    const session = await getCurrentUser();
    if (session && session.role === "worker") return session;
  } catch {
    // fall through to guest
  }
  const jar = await cookies();
  const raw = jar.get(WORKER_COOKIE)?.value;
  if (raw) {
    const existing = await findUser(Number(raw)).catch(() => null);
    if (existing) {
      await db.insert(workerProfiles).values({ userId: existing.id, skills: [] }).onConflictDoNothing().catch(() => undefined);
      return { ...existing, role: "worker" };
    }
  }
  const [u] = await db
    .insert(users)
    .values({ name: "Helper", phone: randomId("guest-w"), passwordHash: "guest", role: "worker" })
    .returning({ id: users.id, name: users.name, phone: users.phone });
  await db.insert(workerProfiles).values({ userId: u.id, skills: [] }).onConflictDoNothing();
  jar.set(WORKER_COOKIE, String(u.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { id: u.id, name: u.name, phone: u.phone, role: "worker" };
}
