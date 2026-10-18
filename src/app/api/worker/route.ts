import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, orders, users, workerProfiles } from "@/db/schema";
import { priceStoredServices } from "@/lib/cluster";
import { json } from "@/lib/auth";
import { CATEGORIES } from "@/lib/catalog";
import { distanceKm, etaMinutes, isValidAadhaar } from "@/lib/geo";
import { getWorker } from "@/lib/guest";
import { gradeQuiz, publicQuiz } from "@/lib/quiz";
import { ensureDemoData } from "@/lib/seed";
import { DOC_LABELS, getOnboardingState, ratingOf } from "@/lib/worker";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getWorker();
  try {
    await ensureDemoData();
  } catch (err) {
    console.error("[worker] seed failed:", err);
  }
  const state = await getOnboardingState(user.id);
  const p = state.profile;

  // Live alerts: searching jobs matching skills within each job's radius
  let alerts: unknown[] = [];
  if (state.complete && p.online && p.lat != null && p.lng != null) {
    const open = await db
      .select({ job: jobs, order: orders })
      .from(jobs)
      .innerJoin(orders, eq(orders.id, jobs.orderId))
      .where(eq(jobs.status, "searching"))
      .orderBy(desc(jobs.createdAt))
      .limit(100);
    alerts = open
      .filter(({ job }) => job.categories.every((c) => p.skills.includes(c)))
      .map(({ job, order }) => {
        const km = distanceKm(p.lat!, p.lng!, order.lat, order.lng);
        return {
          id: job.id,
          title: job.title,
          clusterType: job.clusterType,
          services: job.services,
          radiusKm: job.radiusKm,
          surchargePct: job.surchargePct,
          travelFee: job.travelFee ?? 0,
          amount: priceStoredServices(job.services, (job.clusterType as "household" | "trade") ?? "household").total + (job.travelFee ?? 0),
          workerPay: priceStoredServices(job.services, (job.clusterType as "household" | "trade") ?? "household").workerPay + (job.travelFee ?? 0),
          area: order.address.split(",").slice(-2).join(",").trim(),
          distanceKm: Math.round(km * 10) / 10,
          eta: etaMinutes(km),
          createdAt: job.createdAt,
        };
      })
      .filter((a) => a.distanceKm <= a.radiusKm);
  }

  const myJobs = await db
    .select({ job: jobs, order: orders })
    .from(jobs)
    .innerJoin(orders, eq(orders.id, jobs.orderId))
    .where(eq(jobs.workerId, user.id))
    .orderBy(desc(jobs.createdAt));
  const mapped = myJobs.map(({ job, order }) => ({
    id: job.id,
    title: job.title,
    status: job.status,
    services: job.services,
    address: order.address,
    amount: priceStoredServices(job.services, (job.clusterType as "household" | "trade") ?? "household").total + (job.travelFee ?? 0),
    rating: job.rating,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  }));

  return json({
    user,
    profile: {
      skills: p.skills,
      verified: p.verified,
      online: p.online,
      aadhaarLast4: p.aadhaarLast4,
      aadhaarVerified: p.aadhaarVerified,
      quizScore: p.quizScore,
      quizPassed: p.quizPassed,
      lat: p.lat,
      lng: p.lng,
      rating: ratingOf(p),
      ratingCount: p.ratingCount,
    },
    onboarding: {
      steps: state.steps,
      complete: state.complete,
      required: state.required.map((t) => ({ type: t, label: DOC_LABELS[t] })),
      docs: state.docs,
    },
    quiz: publicQuiz(),
    alerts,
    active: mapped.filter((j) => ["assigned", "in_progress"].includes(j.status)),
    history: mapped.filter((j) => ["completed", "cancelled"].includes(j.status)),
  });
}

export async function POST(req: Request) {
  const user = await getWorker();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const current = await getOnboardingState(user.id); // ensures profile row exists

  if (action === "profile") {
    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) return json({ error: "Enter your name" }, 400);
    await db.update(users).set({ name }).where(eq(users.id, user.id));
  } else if (action === "skills") {
    const valid = new Set(CATEGORIES.map((c) => c.id));
    const skills = (Array.isArray(body.skills) ? body.skills : []).map(String).filter((s: string) => valid.has(s));
    if (!skills.length) return json({ error: "Select at least one skill" }, 400);
    await db.update(workerProfiles).set({ skills }).where(eq(workerProfiles.userId, user.id));
  } else if (action === "aadhaar") {
    const num = String(body.number || "").replace(/\s/g, "");
    if (!isValidAadhaar(num)) return json({ error: "Invalid Aadhaar number (checksum failed). Please re-check the 12 digits." }, 400);
    // Store only last 4 digits. Plug real UIDAI / DigiLocker e-KYC here in production.
    await db.update(workerProfiles).set({ aadhaarLast4: num.slice(-4), aadhaarVerified: true }).where(eq(workerProfiles.userId, user.id));
  } else if (action === "quiz") {
    if (!current.profile.skills.length) return json({ error: "Save your skills before taking the quiz" }, 400);
    const result = gradeQuiz(body.answers || {}, current.profile.skills);
    await db.update(workerProfiles).set({ quizScore: result.score, quizPassed: result.passed }).where(eq(workerProfiles.userId, user.id));
    await getOnboardingState(user.id);
    return json({ ok: true, ...result });
  } else if (action === "online") {
    await db.update(workerProfiles).set({ online: !!body.online }).where(eq(workerProfiles.userId, user.id));
  } else if (action === "location") {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
      return json({ error: "Invalid location" }, 400);
    await db.update(workerProfiles).set({ lat, lng, locationUpdatedAt: new Date() }).where(eq(workerProfiles.userId, user.id));
  } else {
    return json({ error: "Unknown action" }, 400);
  }
  await getOnboardingState(user.id);
  return json({ ok: true });
}

