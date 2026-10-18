"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MapView from "@/components/MapView";
import StatusBadge from "@/components/StatusBadge";
import { PriceNote } from "@/components/BookingSheet";

type Data = {
  job: {
    id: number;
    title: string;
    status: string;
    services: { name: string; hours: number; rate: number }[];
    amount: number;
    baseAmount: number;
    surchargePct: number;
    approvedExtra: number;
  };
  order: { address: string; lat: number; lng: number; request: string | null };
  customer: { name: string; phone?: string };
  extras: { id: number; description: string; amount: number; status: string }[];
  mine: boolean;
  distanceKm: number | null;
  eta: number | null;
};

export default function WorkerJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) setError(d.error);
    else setData(d);
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (body: Record<string, unknown>) => {
    setMsg(null);
    const r = await fetch(`/api/jobs/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) setMsg(d.error);
    load();
    return r.ok;
  };

  if (error) return <p className="p-6 text-center text-red-600">{error} <Link href="/worker" className="block text-teal-700">← Back</Link></p>;
  if (!data) return <p className="p-6 text-center text-slate-400">Loading…</p>;
  const { job, order } = data;

  return (
    <main>
      <header className="sticky top-7 z-30 flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <Link href="/worker" className="text-xl text-slate-500">←</Link>
        <div className="flex-1">
          <h1 className="font-extrabold">{job.title}</h1>
          <StatusBadge status={job.status} />
        </div>
        <p className="text-lg font-bold text-teal-700">₹{job.amount}</p>
      </header>

      <div className="space-y-4 p-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Customer</p>
          <div className="flex items-center justify-between">
            <p className="font-bold">{data.customer.name}</p>
            {data.customer.phone && <a href={`tel:${data.customer.phone}`} className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700">📞 Call</a>}
          </div>
          <p className="mt-1 text-sm text-slate-600">📍 {order.address}</p>
          {order.request && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs italic text-slate-500">“{order.request}”</p>}
          <ul className="mt-3 space-y-1 text-sm">
            {job.services.map((s, i) => (
              <li key={i} className="flex justify-between">
                <span>{s.name} · {s.hours}h</span>
                <span className="text-slate-500">₹{s.rate}/hr</span>
              </li>
            ))}
          </ul>
        </section>

        {data.distanceKm != null && job.status !== "completed" && (
          <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <span>🛵 {data.distanceKm} km to customer</span>
            <span className="font-bold">~{data.eta} min</span>
          </div>
        )}
        {job.status !== "completed" && <MapView home={{ lat: order.lat, lng: order.lng }} />}

        {!data.mine && job.status === "searching" && (
          <button
            onClick={async () => {
              if (await act({ action: "accept" })) router.refresh();
            }}
            className="w-full rounded-xl bg-teal-600 py-3 font-bold text-white"
          >
            Accept job
          </button>
        )}

        {data.mine && job.status === "assigned" && (
          <section className="rounded-2xl border-2 border-slate-900 bg-white p-4">
            <p className="font-bold">🔐 Arrived? Enter the customer&apos;s PIN</p>
            <p className="text-xs text-slate-500">Ask the customer for the 4-digit PIN shown in their app.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="••••"
                className="w-full rounded-xl border border-slate-300 p-3 text-center font-mono text-2xl tracking-[0.5em]"
              />
              <button disabled={pin.length !== 4} onClick={() => act({ action: "verify_pin", pin })} className="rounded-xl bg-slate-900 px-5 font-bold text-white disabled:opacity-40">
                Verify
              </button>
            </div>
          </section>
        )}

        {data.mine && ["assigned", "in_progress"].includes(job.status) && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-bold">Request extra charge / materials</p>
            <p className="text-xs text-slate-500">Discuss with the customer first. You may buy materials only after they approve.</p>
            <div className="mt-2 flex gap-2">
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. New tap washer" className="flex-1 rounded-lg border border-slate-300 p-2 text-sm" />
              <input value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} placeholder="₹" inputMode="numeric" className="w-20 rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
            <button
              onClick={async () => {
                if (await act({ action: "propose_extra", description: desc, amount: Number(amt) })) {
                  setDesc("");
                  setAmt("");
                }
              }}
              className="mt-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white"
            >
              Send for approval
            </button>
            {data.extras.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {data.extras.map((e) => (
                  <li key={e.id} className="flex justify-between rounded-lg bg-slate-50 p-2">
                    <span>{e.description} · ₹{e.amount}</span>
                    <span className={`text-xs font-bold ${e.status === "approved" ? "text-emerald-700" : e.status === "rejected" ? "text-red-500" : "text-amber-600"}`}>
                      {e.status === "pending" ? "Waiting for customer…" : e.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {data.mine && job.status === "in_progress" && (
          <button onClick={() => confirm("Mark this job as completed?") && act({ action: "complete" })} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white">
            ✅ Mark job completed
          </button>
        )}
        {job.status === "completed" && <p className="rounded-xl bg-emerald-50 p-4 text-center font-semibold text-emerald-800">Job completed · Earned ₹{job.amount}</p>}
        {job.status === "cancelled" && <p className="rounded-xl bg-slate-100 p-4 text-center text-slate-600">The customer cancelled this job.</p>}
        {msg && <p className="text-center text-sm text-red-600">{msg}</p>}
        <PriceNote />
      </div>
    </main>
  );
}
