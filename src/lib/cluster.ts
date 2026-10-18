import {
  BUNDLE_DISCOUNT_PCT,
  BUNDLE_MAX_HOURS,
  BUNDLE_MAX_TASKS,
  CATEGORIES,
  PLATFORM_FEE_PCT,
  getSub,
  round2,
  taskBase,
} from "./catalog";
import type { JobService } from "@/db/schema";

export type Selection = { subId: string; hours: number };

export type PlannedJob = {
  title: string;
  clusterType: "household" | "trade";
  services: JobService[];
  categories: string[];
  // Pricing (₹): base = Σ govt task bases; discount = bundle %; feeBase = base - discount;
  // platformFee = 15% of feeBase; total = feeBase + platformFee (+ travelFee at dispatch).
  baseAmount: number;
  discount: number;
  feeBase: number;
  platformFee: number;
  total: number;
  workerPay: number;
  totalHours: number;
};

export type PriceBreakdown = {
  base: number;
  discount: number;
  feeBase: number;
  platformFee: number;
  total: number;
  workerPay: number;
};

function price(base: number, clusterType: "household" | "trade", taskCount: number): PriceBreakdown {
  const discount =
    clusterType === "household" && taskCount >= 2 ? round2((base * BUNDLE_DISCOUNT_PCT) / 100) : 0;
  const feeBase = round2(base - discount);
  const platformFee = round2((feeBase * PLATFORM_FEE_PCT) / 100);
  const total = round2(feeBase + platformFee);
  return { base, discount, feeBase, platformFee, total, workerPay: feeBase };
}

function toService(subId: string, hours: number): JobService | null {
  const sub = getSub(subId);
  if (!sub) return null;
  const h = Math.max(1, Math.min(12, Math.round(hours || 1)));
  return { subId: sub.id, name: sub.name, categoryId: sub.categoryId, hours: h, initial: sub.initial, subsequent: sub.subsequent, base: taskBase(sub, h) };
}

/**
 * Smart clustering (win-win-win):
 *  - Household tasks are bundled into visits of max 3 subtasks / ~3 hours, handled
 *    by ONE multi-skilled worker. Bundles of 2+ tasks get an 8% AI bundle discount
 *    (customer saves; worker earns more per visit; കൂട്ടായി keeps 15% + efficiency).
 *  - Licensed trades (electrical / plumbing) become separate visits, one per trade,
 *    with no bundle discount.
 */
export function clusterServices(selections: Selection[]): PlannedJob[] {
  const household: JobService[] = [];
  const trades = new Map<string, JobService[]>();

  for (const sel of selections) {
    const svc = toService(sel.subId, sel.hours);
    if (!svc) continue;
    const sub = getSub(sel.subId)!;
    if (sub.category.cluster === "household") household.push(svc);
    else trades.set(sub.categoryId, [...(trades.get(sub.categoryId) ?? []), svc]);
  }

  const jobs: PlannedJob[] = [];
  const build = (title: string, clusterType: "household" | "trade", services: JobService[]): PlannedJob => {
    const p = price(round2(services.reduce((a, s) => a + s.base, 0)), clusterType, services.length);
    return {
      title,
      clusterType,
      services,
      categories: [...new Set(services.map((s) => s.categoryId))],
      baseAmount: p.base,
      discount: p.discount,
      feeBase: p.feeBase,
      platformFee: p.platformFee,
      total: p.total,
      workerPay: p.workerPay,
      totalHours: services.reduce((a, s) => a + s.hours, 0),
    };
  };

  // Split household tasks into visit-sized chunks (≤3 tasks, ≤3 hours each).
  let chunk: JobService[] = [];
  let chunkHours = 0;
  const flush = () => {
    if (chunk.length)
      jobs.push(
        build(chunk.length > 1 ? `Home-care bundle (${chunk.length} tasks)` : chunk[0].name, "household", chunk),
      );
    chunk = [];
    chunkHours = 0;
  };
  for (const svc of household) {
    if (
      chunk.length >= BUNDLE_MAX_TASKS ||
      chunkHours + svc.hours > BUNDLE_MAX_HOURS ||
      (chunk.length > 0 && chunkHours === 0)
    )
      flush();
    chunk.push(svc);
    chunkHours += svc.hours;
    if (chunk.length >= BUNDLE_MAX_TASKS || chunkHours >= BUNDLE_MAX_HOURS) flush();
  }
  flush();

  for (const [catId, services] of trades) {
    const cat = CATEGORIES.find((c) => c.id === catId)!;
    jobs.push(build(`${cat.name} visit`, "trade", services));
  }
  return jobs;
}

/** Recompute the price breakdown for services stored on a job (with legacy fallback). */
export function priceStoredServices(
  stored: Array<{ subId: string; hours: number; initial?: number; subsequent?: number; base?: number; rate?: number }>,
  clusterType: "household" | "trade" = "household",
): PriceBreakdown {
  let base = 0;
  for (const s of stored) {
    const sub = getSub(s.subId);
    if (sub) base += taskBase(sub, s.hours);
    else if (typeof s.base === "number") base += s.base;
    else if (typeof s.rate === "number") base += s.rate * s.hours;
  }
  return price(round2(base), clusterType, stored.length);
}
