import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { extraCharges, jobs, orders } from "@/db/schema";
import { json } from "@/lib/auth";
import { EXPANSION_OPTIONS } from "@/lib/catalog";
import { priceStoredServices } from "@/lib/cluster";
import { distanceKm, etaMinutes } from "@/lib/geo";
import { ensureDemoData } from "@/lib/seed";
import { eligibleWorkers, workerCards } from "@/lib/worker";

export const dynamic = "force-dynamic";

// No login — anyone with the order link can track it.
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  try {
    await ensureDemoData();
  } catch (err) {
    console.error("[orders] seed failed:", err);
  }
  const { id } = await ctx.params;
  const [order] = await db.select().from(orders).where(eq(orders.id, Number(id))).limit(1);
  if (!order) return json({ error: "Order not found" }, 404);

  const orderJobs = await db.select().from(jobs).where(eq(jobs.orderId, order.id)).orderBy(jobs.id);
  const extras = orderJobs.length
    ? await db.select().from(extraCharges).where(inArray(extraCharges.jobId, orderJobs.map((j) => j.id)))
    : [];
  const cards = await workerCards(orderJobs.map((j) => j.workerId).filter((x): x is number => !!x));

  const result = await Promise.all(
    orderJobs.map(async (j) => {
      const jobExtras = extras.filter((e) => e.jobId === j.id);
      const approvedExtra = jobExtras.filter((e) => e.status === "approved").reduce((a, e) => a + e.amount, 0);
      const p = priceStoredServices(j.services, (j.clusterType as "household" | "trade") ?? "household");
      const travel = j.travelFee ?? 0;
      let nearbyCount: number | null = null;
      let offerExpansion = false;
      if (j.status === "searching") {
        nearbyCount = (await eligibleWorkers(j.categories, order.lat, order.lng, j.radiusKm)).length;
        const waitingSec = (Date.now() - new Date(j.createdAt).getTime()) / 1000;
        offerExpansion = nearbyCount === 0 || waitingSec > 120;
      }
      const w = j.workerId ? cards.get(j.workerId) : undefined;
      let tracking = null;
      if (w && w.lat != null && w.lng != null) {
        const km = distanceKm(order.lat, order.lng, w.lat, w.lng);
        tracking = { lat: w.lat, lng: w.lng, km: Math.round(km * 10) / 10, eta: etaMinutes(km), updatedAt: w.locationUpdatedAt };
      }
      return {
        ...j,
        pin: j.status === "assigned" ? j.pin : j.status === "searching" ? j.pin : null,
        // Itemized കൂട്ടായി bill: worker base − bundle discount + 15% fee + travel + approved extras
        bill: {
          lines: j.services.map((s) => ({ name: s.name, hours: s.hours, base: s.base ?? 0 })),
          base: p.base,
          discount: p.discount,
          feeBase: p.feeBase,
          platformFee: p.platformFee,
          travelFee: travel,
          approvedExtra,
        },
        amount: p.total + travel + approvedExtra,
        workerPay: p.workerPay + travel,
        extras: jobExtras,
        nearbyCount,
        offerExpansion,
        expansionOptions: EXPANSION_OPTIONS.filter((o) => o.radiusKm > j.radiusKm),
        worker: w ? { id: w.id, name: w.name, phone: w.phone, verified: w.verified, rating: w.rating, ratingCount: w.ratingCount, skills: w.skills } : null,
        tracking,
      };
    }),
  );
  return json({ order, jobs: result });
}
