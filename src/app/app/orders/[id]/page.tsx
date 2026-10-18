"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MapView from "@/components/MapView";
import StatusBadge, { Stars, VerifiedBadge } from "@/components/StatusBadge";
import { PriceNote } from "@/components/BookingSheet";
import { PLATFORM_FEE_PCT, fmt } from "@/lib/catalog";

type Extra = { id: number; description: string; amount: number; status: string };
type Bill = {
  lines: { name: string; hours: number; base: number }[];
  base: number;
  discount: number;
  feeBase: number;
  platformFee: number;
  travelFee: number;
  approvedExtra: number;
};
type Job = {
  id: number;
  title: string;
  clusterType: string;
  status: string;
  services: { subId: string; name: string; hours: number }[];
  radiusKm: number;
  pin: string | null;
  amount: number;
  workerPay: number;
  rating: number | null;
  bill: Bill;
  extras: Extra[];
  nearbyCount: number | null;
  offerExpansion: boolean;
  expansionOptions: { radiusKm: number; fee: number }[];
  worker: { id: number; name: string; phone: string; verified: boolean; rating: number | null; ratingCount: number; skills: string[] } | null;
  tracking: { lat: number; lng: number; km: number; eta: number; updatedAt: string | null } | null;
};
type Data = { order: { id: number; address: string; lat: number; lng: number; request: string | null; createdAt: string }; jobs: Job[] };

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    const d = await res.json();
    if (!res.ok) setError(d.error);
    else setData(d);
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (jobId: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) alert(d.error);
    load();
  };

  if (error) return <p className="p-6 text-center text-red-600">{error}</p>;
  if (!data) return <p className="p-6 text-center text-slate-400">Loading order…</p>;
  const total = data.jobs.filter((j) => j.status !== "cancelled").reduce((a, j) => a + j.amount, 0);

  return (
    <main>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <Link href="/app/orders" className="text-xl text-slate-500">←</Link>
        <div className="flex-1">
          <h1 className="font-extrabold">Order #{data.order.id}</h1>
          <p className="line-clamp-1 text-xs text-slate-500">📍 {data.order.address}</p>
        </div>
        <p className="text-lg font-bold">{fmt(total)}</p>
      </header>

      <div className="space-y-4 p-4">
        {data.order.request && <p className="rounded-xl bg-white p-3 text-sm italic text-slate-600 shadow-sm">🗣️ “{data.order.request}”</p>}
        {data.jobs.length > 1 && (
          <p className="text-xs text-slate-500">✨ Your request was split into {data.jobs.length} visits by smart clustering.</p>
        )}
        {data.jobs.map((j) => (
          <JobCard key={j.id} job={j} home={{ lat: data.order.lat, lng: data.order.lng }} act={act} />
        ))}
        <PriceNote />
      </div>
    </main>
  );
}

function Receipt({ job: j }: { job: Job }) {
  const b = j.bill;
  return (
    <div className="border-t border-dashed border-slate-200 p-4 text-sm">
      <p className="mb-1 font-bold">🧾 Digital receipt</p>
      <ul className="space-y-0.5 text-slate-600">
        {b.lines.map((l, i) => (
          <li key={i} className="flex justify-between">
            <span>{l.name} · {l.hours}h</span>
            <span>{fmt(l.base)}</span>
          </li>
        ))}
      </ul>
      {b.discount > 0 && (
        <p className="flex justify-between font-semibold text-emerald-700">
          <span>AI bundle discount</span>
          <span>−{fmt(b.discount)}</span>
        </p>
      )}
      <p className="flex justify-between text-slate-600">
        <span>Worker base (Kerala Govt baseline)</span>
        <span>{fmt(b.feeBase)}</span>
      </p>
      <p className="flex justify-between text-slate-600">
        <span>കൂട്ടായി service fee ({PLATFORM_FEE_PCT}%)</span>
        <span>{fmt(b.platformFee)}</span>
      </p>
      {b.travelFee > 0 && (
        <p className="flex justify-between text-slate-600">
          <span>Travel fee (10 km expansion)</span>
          <span>{fmt(b.travelFee)}</span>
        </p>
      )}
      {b.approvedExtra > 0 && (
        <p className="flex justify-between text-slate-600">
          <span>Approved extras</span>
          <span>{fmt(b.approvedExtra)}</span>
        </p>
      )}
      <p className="mt-1 flex justify-between border-t border-slate-100 pt-1 text-base font-extrabold">
        <span>Total paid</span>
        <span>{fmt(j.amount)}</span>
      </p>
      <button
        onClick={() => {
          localStorage.setItem("kootay_rebook", JSON.stringify(j.services.map((s) => ({ subId: s.subId, hours: s.hours }))));
          window.location.assign("/app/categories");
        }}
        className="mt-2 w-full rounded-xl bg-slate-100 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
      >
        ↻ Re-book these services
      </button>
    </div>
  );
}

function JobCard({
  job: j,
  home,
  act,
}: {
  job: Job;
  home: { lat: number; lng: number };
  act: (id: number, body: Record<string, unknown>) => void;
}) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-4">
        <div>
          <p className="font-bold">{j.title}</p>
          <p className="text-xs text-slate-500">
            {j.services.map((s) => `${s.name} (${s.hours}h)`).join(" · ")}
          </p>
        </div>
        <StatusBadge status={j.status} />
      </div>

      {j.status === "searching" && (
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center">
              <span className="absolute h-full w-full animate-ping rounded-full bg-teal-400 opacity-40" />
              <span className="relative text-2xl">📡</span>
            </span>
            <div className="text-sm">
              <p className="font-semibold">Alerting verified workers within {j.radiusKm} km…</p>
              <p className="text-xs text-slate-500">
                {j.nearbyCount ? `${j.nearbyCount} matching worker${j.nearbyCount > 1 ? "s" : ""} online nearby` : "No matching workers online in this radius"}
              </p>
            </div>
          </div>
          {j.offerExpansion && j.expansionOptions.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">
                {j.nearbyCount ? "Still waiting?" : `No taskers within ${j.radiusKm} km.`} Expand the search?
              </p>
              <p className="mb-2 text-xs text-amber-800">With your permission we&apos;ll search a wider area. An extra travel fee goes to the worker.</p>
              <div className="grid grid-cols-1 gap-2">
                {j.expansionOptions.map((o) => (
                  <button
                    key={o.radiusKm}
                    onClick={() => {
                      if (confirm(`Expand search to ${o.radiusKm} km? A travel fee of ${fmt(o.fee)} will be added.`))
                        act(j.id, { action: "expand", radiusKm: o.radiusKm });
                    }}
                    className="rounded-xl bg-white p-2 text-center shadow-sm hover:ring-2 hover:ring-amber-400"
                  >
                    <p className="font-bold">Expand to {o.radiusKm} km</p>
                    <p className="text-[11px] text-amber-700">+{fmt(o.fee)} travel fee</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {j.worker && (
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-lg font-bold text-white">
              {j.worker.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="flex items-center gap-1.5 font-bold">
                {j.worker.name} {j.worker.verified && <VerifiedBadge />}
              </p>
              <Stars rating={j.worker.rating} count={j.worker.ratingCount} />
            </div>
            <a href={`tel:${j.worker.phone}`} className="rounded-full bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">📞 Call</a>
          </div>

          {j.status === "assigned" && (
            <>
              {j.tracking && (
                <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <span>🛵 {j.tracking.km} km away</span>
                  <span className="font-bold">ETA ~{j.tracking.eta} min</span>
                </div>
              )}
              <MapView home={home} worker={j.tracking ? { lat: j.tracking.lat, lng: j.tracking.lng } : null} />
              {j.tracking?.updatedAt && (
                <p className="text-[11px] text-slate-400">Live location updated {new Date(j.tracking.updatedAt).toLocaleTimeString("en-IN")}</p>
              )}
            </>
          )}

          {j.pin && j.status === "assigned" && (
            <div className="rounded-2xl bg-slate-900 p-4 text-center text-white">
              <p className="text-xs text-slate-300">Share this PIN only when the worker reaches your venue</p>
              <p className="mt-1 font-mono text-4xl font-black tracking-[0.4em]">{j.pin}</p>
            </div>
          )}
          {j.status === "in_progress" && <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900">✅ PIN verified — work has started.</p>}
        </div>
      )}

      {j.status === "searching" && j.pin && (
        <p className="px-4 pb-3 text-xs text-slate-400">Your arrival PIN will be shown once a worker accepts.</p>
      )}

      {j.extras.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 p-4">
          <p className="text-sm font-bold">Extra charges / materials</p>
          {j.extras.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-sm">
              <div>
                <p>{e.description}</p>
                <p className="font-bold">₹{e.amount}</p>
              </div>
              {e.status === "pending" ? (
                <div className="flex gap-1.5">
                  <button onClick={() => act(j.id, { action: "extra_decision", extraId: e.id, decision: "approved" })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Approve</button>
                  <button onClick={() => act(j.id, { action: "extra_decision", extraId: e.id, decision: "rejected" })} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold">Reject</button>
                </div>
              ) : (
                <span className={`text-xs font-semibold ${e.status === "approved" ? "text-emerald-700" : "text-slate-400"}`}>{e.status}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {j.status === "completed" && <Receipt job={j} />}

      {j.status === "completed" && !j.rating && (
        <div className="space-y-2 border-t border-slate-100 p-4">
          <p className="text-sm font-bold">Rate {j.worker?.name}</p>
          <div className="flex gap-1 text-3xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className={n <= rating ? "text-amber-400" : "text-slate-300"}>★</button>
            ))}
          </div>
          <input value={review} onChange={(e) => setReview(e.target.value)} placeholder="Write a short review (optional)" className="w-full rounded-xl border border-slate-300 p-2.5 text-sm" />
          <button disabled={!rating} onClick={() => act(j.id, { action: "rate", rating, review })} className="w-full rounded-xl bg-teal-600 py-2.5 font-bold text-white disabled:opacity-40">Submit rating</button>
        </div>
      )}
      {j.rating && <p className="border-t border-slate-100 px-4 py-3 text-sm text-amber-600">You rated {"★".repeat(j.rating)}</p>}

      {["searching", "assigned"].includes(j.status) && (
        <button
          onClick={() => confirm("Cancel this visit?") && act(j.id, { action: "cancel" })}
          className="w-full border-t border-slate-100 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Cancel visit
        </button>
      )}
    </section>
  );
}
