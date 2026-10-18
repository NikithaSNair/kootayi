import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documents, users, workerProfiles } from "@/db/schema";
import { distanceKm } from "./geo";

export type DocType = "aadhaar" | "pcc" | "kseb" | "iti" | "kwa";

export const DOC_LABELS: Record<DocType, string> = {
  aadhaar: "Aadhaar card",
  pcc: "Police Clearance Certificate",
  kseb: "KSEB Wireman Permit (Electrician)",
  iti: "ITI Plumbing Certificate",
  kwa: "KWA Plumber Licence",
};

/** Core required docs. Plumbing needs ITI *or* KWA (either satisfies). */
export function requiredDocs(skills: string[], uploaded?: Set<string>): DocType[] {
  const docs: DocType[] = ["aadhaar", "pcc"];
  if (skills.includes("electrical")) docs.push("kseb");
  if (skills.includes("plumbing") && !(uploaded?.has("iti") || uploaded?.has("kwa"))) docs.push("iti");
  return docs;
}

export function licencesDone(skills: string[], uploaded: Set<string>) {
  const elec = !skills.includes("electrical") || uploaded.has("kseb");
  const plumb = !skills.includes("plumbing") || uploaded.has("iti") || uploaded.has("kwa");
  return elec && plumb;
}

export async function getOnboardingState(userId: number) {
  let [profile] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, userId)).limit(1);
  if (!profile) {
    [profile] = await db.insert(workerProfiles).values({ userId, skills: [] }).returning();
  }
  const docs = await db
    .select({ type: documents.type, fileName: documents.fileName, createdAt: documents.createdAt })
    .from(documents)
    .where(eq(documents.userId, userId));
  const uploaded = new Set(docs.map((d) => d.type));
  const required = requiredDocs(profile.skills, uploaded);
  const missingDocs = required.filter((d) => !uploaded.has(d));
  const steps = {
    skills: profile.skills.length > 0,
    aadhaar: profile.aadhaarVerified && uploaded.has("aadhaar"),
    pcc: uploaded.has("pcc"),
    licences: licencesDone(profile.skills, uploaded),
    quiz: profile.quizPassed,
  };
  // "Under Verification" until every step is done (= admin approval for prototype).
  const complete = Object.values(steps).every(Boolean);
  if (complete !== profile.verified) {
    await db.update(workerProfiles).set({ verified: complete }).where(eq(workerProfiles.userId, userId));
    profile = { ...profile, verified: complete };
  }
  return { profile, docs, required, missingDocs, steps, complete };
}

export function ratingOf(p: { ratingSum: number; ratingCount: number }) {
  return p.ratingCount ? Math.round((p.ratingSum / p.ratingCount) * 10) / 10 : null;
}

/** Online, verified workers whose skills cover all categories, within radius. */
export async function eligibleWorkers(categories: string[], lat: number, lng: number, radiusKm: number) {
  const rows = await db
    .select({
      userId: workerProfiles.userId,
      name: users.name,
      skills: workerProfiles.skills,
      lat: workerProfiles.lat,
      lng: workerProfiles.lng,
    })
    .from(workerProfiles)
    .innerJoin(users, eq(users.id, workerProfiles.userId))
    .where(and(eq(workerProfiles.verified, true), eq(workerProfiles.online, true)));
  return rows
    .filter((r) => r.lat != null && r.lng != null && categories.every((c) => r.skills.includes(c)))
    .map((r) => ({ ...r, distance: distanceKm(lat, lng, r.lat!, r.lng!) }))
    .filter((r) => r.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

export async function workerCards(ids: number[]) {
  if (!ids.length) return new Map<number, WorkerCard>();
  const rows = await db
    .select({
      userId: workerProfiles.userId,
      name: users.name,
      phone: users.phone,
      skills: workerProfiles.skills,
      verified: workerProfiles.verified,
      lat: workerProfiles.lat,
      lng: workerProfiles.lng,
      locationUpdatedAt: workerProfiles.locationUpdatedAt,
      ratingSum: workerProfiles.ratingSum,
      ratingCount: workerProfiles.ratingCount,
    })
    .from(workerProfiles)
    .innerJoin(users, eq(users.id, workerProfiles.userId))
    .where(inArray(workerProfiles.userId, ids));
  return new Map(
    rows.map((r) => [
      r.userId,
      {
        id: r.userId,
        name: r.name,
        phone: r.phone,
        skills: r.skills,
        verified: r.verified,
        lat: r.lat,
        lng: r.lng,
        locationUpdatedAt: r.locationUpdatedAt,
        rating: ratingOf(r),
        ratingCount: r.ratingCount,
      },
    ]),
  );
}

export type WorkerCard = {
  id: number;
  name: string;
  phone: string;
  skills: string[];
  verified: boolean;
  lat: number | null;
  lng: number | null;
  locationUpdatedAt: Date | null;
  rating: number | null;
  ratingCount: number;
};
