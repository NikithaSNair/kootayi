import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, users, workerProfiles } from "@/db/schema";
import { hashPassword } from "./auth";
import { requiredDocs } from "./worker";

let seedPromise: Promise<void> | null = null;

// 1x1 transparent PNG used as a placeholder document for demo workers
const PLACEHOLDER_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function ensureDemoDocs(userId: number, skills: string[]) {
  const have = new Set(
    (await db.select({ type: documents.type }).from(documents).where(eq(documents.userId, userId))).map((d) => d.type),
  );
  const needed = requiredDocs(skills, have).filter((t) => !have.has(t));
  // Plumbing demo workers hold ITI (KWA is accepted as an alternative).
  if (needed.length) {
    await db
      .insert(documents)
      .values(
        needed.map((type) => ({ userId, type, fileName: `demo-${type}.png`, mimeType: "image/png", data: PLACEHOLDER_PNG })),
      )
      .onConflictDoNothing();
  }
  await db
    .update(workerProfiles)
    .set({ aadhaarVerified: true, quizPassed: true, verified: true })
    .where(eq(workerProfiles.userId, userId));
}

const DEMO_WORKERS = [
  { name: "Lissy Thomas", phone: "9000000001", skills: ["kitchen", "cleaning", "care", "outdoor"], lat: 9.9894, lng: 76.2905, ratingSum: 47, ratingCount: 10 },
  { name: "Suresh Kumar", phone: "9000000002", skills: ["electrical"], lat: 9.9700, lng: 76.3120, ratingSum: 88, ratingCount: 19 },
  { name: "Anwar Sadath", phone: "9000000003", skills: ["plumbing"], lat: 10.0050, lng: 76.3080, ratingSum: 41, ratingCount: 9 },
  { name: "Mini Joseph", phone: "9000000004", skills: ["kitchen", "cleaning", "care"], lat: 10.0159, lng: 76.3419, ratingSum: 23, ratingCount: 5 },
  { name: "Rajan P.", phone: "9000000005", skills: ["electrical", "plumbing"], lat: 10.1004, lng: 76.3570, ratingSum: 30, ratingCount: 7 },
];

async function seedOnce() {
  for (const w of DEMO_WORKERS) {
    try {
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.phone, w.phone)).limit(1);
      if (existing.length) {
        await db.update(workerProfiles).set({ skills: w.skills }).where(eq(workerProfiles.userId, existing[0].id)).catch(() => undefined);
        await ensureDemoDocs(existing[0].id, w.skills);
        continue;
      }
      const inserted = await db
        .insert(users)
        .values({ name: w.name, phone: w.phone, passwordHash: hashPassword("demo123"), role: "worker" })
        .onConflictDoNothing({ target: users.phone })
        .returning({ id: users.id });
      const userId = inserted[0]?.id ?? (await db.select({ id: users.id }).from(users).where(eq(users.phone, w.phone)).limit(1))[0]?.id;
      if (!userId) continue;
      await ensureDemoDocs(userId, w.skills);
      await db
        .insert(workerProfiles)
        .values({
          userId,
          skills: w.skills,
          aadhaarLast4: "0000",
          aadhaarVerified: true,
          quizScore: 90,
          quizPassed: true,
          verified: true,
          online: true,
          lat: w.lat,
          lng: w.lng,
          locationUpdatedAt: new Date(),
          ratingSum: w.ratingSum,
          ratingCount: w.ratingCount,
        })
        .onConflictDoNothing();
    } catch (err) {
      console.error(`[seed] demo worker ${w.phone} failed:`, err);
    }
  }
}

/** Demo verified workers around Kochi. Safe to call on every request. */
export async function ensureDemoData() {
  if (!seedPromise) {
    seedPromise = seedOnce().catch((err) => console.error("[seed] failed:", err));
  }
  await seedPromise;
}
