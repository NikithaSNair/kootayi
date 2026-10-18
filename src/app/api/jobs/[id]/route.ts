import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { extraCharges, jobs, orders, users, workerProfiles } from "@/db/schema";
import { json } from "@/lib/auth";
import { EXPANSION_OPTIONS } from "@/lib/catalog";
import { priceStoredServices } from "@/lib/cluster";
import { distanceKm, etaMinutes } from "@/lib/geo";
import { getCustomer, getWorker } from "@/lib/guest";
import { getOnboardingState } from "@/lib/worker";

export const dynamic = "force-dynamic";

const WORKER_ACTIONS = new Set(["accept", "verify_pin", "propose_extra", "complete"]);

async function load(id: number) {
  const [row] = await db
    .select({ job: jobs, order: orders, customer: users.name, customerPhone: users.phone })
    .from(jobs)
    .innerJoin(orders, eq(orders.id, jobs.orderId))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(jobs.id, id))
    .limit(1);
  return row;
}

// Worker view of a job (PIN is never sent to the worker). No login required.
export async function GET(_req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const user = await getWorker();
  const { id } = await ctx.params;
  const row = await load(Number(id));
  if (!row) return json({ error: "Job not found" }, 404);
  const { job, order } = row;
  const mine = job.workerId === user.id;
  if (!mine && job.status !== "searching") return json({ error: "This job was taken by another worker" }, 403);
  const [me] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, user.id)).limit(1);
  const km = me?.lat != null && me?.lng != null ? distanceKm(me.lat, me.lng, order.lat, order.lng) : null;
  const extras = await db.select().from(extraCharges).where(eq(extraCharges.jobId, job.id)).orderBy(extraCharges.id);
  const approvedExtra = extras.filter((e) => e.status === "approved").reduce((a, e) => a + e.amount, 0);
  const p = priceStoredServices(job.services, (job.clusterType as "household" | "trade") ?? "household");
  const travel = job.travelFee ?? 0;
  const { pin: _pin, ...safeJob } = job;
  void _pin;
  return json({
    job: { ...safeJob, amount: p.total + travel + approvedExtra, workerPay: p.workerPay + travel, approvedExtra },
    order: { address: order.address, lat: order.lat, lng: order.lng, request: order.request },
    customer: mine ? { name: row.customer, phone: row.customerPhone } : { name: row.customer.split(" ")[0] },
    extras,
    mine,
    distanceKm: km != null ? Math.round(km * 10) / 10 : null,
    eta: km != null ? etaMinutes(km) : null,
  });
}

export async function POST(req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const { id } = await ctx.params;
  const jobId = Number(id);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const row = await load(jobId);
  if (!row) return json({ error: "Job not found" }, 404);
  const { job, order } = row;

  // ---------- Worker actions (no login — per-device guest worker) ----------
  if (WORKER_ACTIONS.has(action)) {
    const user = await getWorker();
    if (action === "accept") {
      const state = await getOnboardingState(user.id);
      if (!state.complete) return json({ error: "Complete verification before accepting jobs" }, 403);
      const p = state.profile;
      if (!job.categories.every((c) => p.skills.includes(c))) return json({ error: "This job needs skills you don't have" }, 403);
      if (p.lat == null || p.lng == null) return json({ error: "Share your location first" }, 400);
      if (distanceKm(p.lat, p.lng, order.lat, order.lng) > job.radiusKm) return json({ error: "You are outside the job radius" }, 403);
      const updated = await db
        .update(jobs)
        .set({ workerId: user.id, status: "assigned", acceptedAt: new Date() })
        .where(and(eq(jobs.id, jobId), eq(jobs.status, "searching"), isNull(jobs.workerId)))
        .returning({ id: jobs.id });
      if (!updated.length) return json({ error: "Sorry, another worker already accepted this job" }, 409);
      return json({ ok: true });
    }
    if (job.workerId !== user.id) return json({ error: "Not your job" }, 403);

    if (action === "verify_pin") {
      if (job.status !== "assigned") return json({ error: "PIN already verified" }, 400);
      if (String(body.pin || "").trim() !== job.pin) return json({ error: "Incorrect PIN. Ask the customer for the 4-digit PIN shown in their app." }, 400);
      await db.update(jobs).set({ status: "in_progress", startedAt: new Date() }).where(eq(jobs.id, jobId));
      return json({ ok: true });
    }
    if (action === "propose_extra") {
      if (!["assigned", "in_progress"].includes(job.status)) return json({ error: "Job is not active" }, 400);
      const description = String(body.description || "").trim().slice(0, 200);
      const amount = Math.round(Number(body.amount));
      if (!description || !Number.isFinite(amount) || amount <= 0 || amount > 50000)
        return json({ error: "Enter a description and a valid amount" }, 400);
      await db.insert(extraCharges).values({ jobId, description, amount });
      return json({ ok: true });
    }
    if (action === "complete") {
      if (job.status !== "in_progress") return json({ error: "Verify the PIN and start the job first" }, 400);
      await db.update(jobs).set({ status: "completed", completedAt: new Date() }).where(eq(jobs.id, jobId));
      await db.update(extraCharges).set({ status: "rejected" }).where(and(eq(extraCharges.jobId, jobId), eq(extraCharges.status, "pending")));
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  }

  // ---------- Customer actions (no login — anyone with the order link) ----------
  await getCustomer();

  if (action === "expand") {
    if (job.status !== "searching") return json({ error: "Job is no longer searching" }, 400);
    const opt = EXPANSION_OPTIONS.find((o) => o.radiusKm === Number(body.radiusKm));
    if (!opt || opt.radiusKm <= job.radiusKm) return json({ error: "Invalid radius" }, 400);
    await db
      .update(jobs)
      .set({ radiusKm: opt.radiusKm, travelFee: opt.fee, surchargePct: 0, createdAt: new Date() })
      .where(eq(jobs.id, jobId));
    return json({ ok: true });
  }
  if (action === "extra_decision") {
    const decision = body.decision === "approved" ? "approved" : "rejected";
    const updated = await db
      .update(extraCharges)
      .set({ status: decision })
      .where(and(eq(extraCharges.id, Number(body.extraId)), eq(extraCharges.jobId, jobId), eq(extraCharges.status, "pending")))
      .returning({ id: extraCharges.id });
    if (!updated.length) return json({ error: "Request not found" }, 404);
    return json({ ok: true });
  }
  if (action === "rate") {
    const rating = Math.round(Number(body.rating));
    if (job.status !== "completed" || job.rating) return json({ error: "Cannot rate this job" }, 400);
    if (!(rating >= 1 && rating <= 5)) return json({ error: "Rating must be 1-5" }, 400);
    await db.update(jobs).set({ rating, review: String(body.review || "").slice(0, 500) || null }).where(eq(jobs.id, jobId));
    if (job.workerId)
      await db
        .update(workerProfiles)
        .set({ ratingSum: sql`${workerProfiles.ratingSum} + ${rating}`, ratingCount: sql`${workerProfiles.ratingCount} + 1` })
        .where(eq(workerProfiles.userId, job.workerId));
    return json({ ok: true });
  }
  if (action === "cancel") {
    if (!["searching", "assigned"].includes(job.status)) return json({ error: "Job can't be cancelled now" }, 400);
    await db.update(jobs).set({ status: "cancelled" }).where(eq(jobs.id, jobId));
    return json({ ok: true });
  }
  return json({ error: "Unknown action" }, 400);
}
