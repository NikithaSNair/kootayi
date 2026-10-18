import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { jobs, orders } from "@/db/schema";
import { json } from "@/lib/auth";
import { DEFAULT_RADIUS_KM } from "@/lib/catalog";
import { clusterServices, priceStoredServices, type Selection } from "@/lib/cluster";
import { getCustomer } from "@/lib/guest";
import { workerCards } from "@/lib/worker";

export const dynamic = "force-dynamic";

function totalsOf(j: { services: Parameters<typeof priceStoredServices>[0]; clusterType: string; travelFee: number | null }) {
  const p = priceStoredServices(j.services, (j.clusterType as "household" | "trade") ?? "household");
  const travel = j.travelFee ?? 0;
  return { total: p.total + travel, workerPay: p.workerPay + travel };
}

export async function GET() {
  const user = await getCustomer();
  const myOrders = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  const ids = myOrders.map((o) => o.id);
  const allJobs = ids.length ? await db.select().from(jobs).where(inArray(jobs.orderId, ids)) : [];
  const cards = await workerCards([...new Set(allJobs.map((j) => j.workerId).filter((x): x is number => !!x))]);
  return json({
    orders: myOrders.map((o) => ({
      ...o,
      jobs: allJobs
        .filter((j) => j.orderId === o.id)
        .map((j) => ({
          id: j.id,
          title: j.title,
          status: j.status,
          services: j.services,
          rating: j.rating,
          amount: totalsOf(j).total,
          worker: j.workerId ? cards.get(j.workerId)?.name ?? null : null,
        })),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getCustomer();
  const body = await req.json().catch(() => ({}));
  const selections: Selection[] = Array.isArray(body.selections) ? body.selections : [];
  const planned = clusterServices(selections);
  if (!planned.length) return json({ error: "Select at least one service" }, 400);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: "Location is required" }, 400);
  const address = String(body.address || "").trim();
  if (!address) return json({ error: "Address is required" }, 400);

  const [order] = await db
    .insert(orders)
    .values({ userId: user.id, request: body.request ? String(body.request).slice(0, 1000) : null, address, lat, lng })
    .returning();
  await db.insert(jobs).values(
    planned.map((p) => ({
      orderId: order.id,
      title: p.title,
      clusterType: p.clusterType,
      services: p.services,
      categories: p.categories,
      baseAmount: p.baseAmount,
      discount: p.discount,
      travelFee: 0,
      radiusKm: DEFAULT_RADIUS_KM,
      pin: String(Math.floor(1000 + Math.random() * 9000)),
    })),
  );
  return json({ ok: true, orderId: order.id });
}
