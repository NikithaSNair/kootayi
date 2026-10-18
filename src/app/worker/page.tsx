"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusBadge, { Stars, VerifiedBadge } from "@/components/StatusBadge";
import { useWorker, workerAction } from "@/components/useWorker";
import { getCategory } from "@/lib/catalog";

export default function WorkerDashboard() {
  const router = useRouter();
  const { data, reload } = useWorker(5000);
  const [busy, setBusy] = useState<number | null>(null);

  if (!data) return <p className="p-6 text-center text-slate-400">Loading…</p>;
  const { profile, onboarding } = data;
  const doneSteps = Object.values(onboarding.steps).filter(Boolean).length;
  const todayEarnings = data.history
    .filter((j) => j.status === "completed" && j.completedAt && new Date(j.completedAt).toDateString() === new Date().toDateString())
    .reduce((a, j) => a + j.amount, 0);

  const accept = async (id: number) => {
    setBusy(id);
    const r = await fetch(`/api/jobs/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept" }) });
    const d = await r.json();
    setBusy(null);
    if (!r.ok) {
      alert(d.error);
      reload();
    } else router.push(`/worker/jobs/${id}`);
  };

  return (
    <main>
      <header className="bg-gradient-to-br from-slate-900 to-teal-900 px-5 pt-6 pb-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-teal-200">Namaskaram,</p>
            <h1 className="flex items-center gap-2 text-xl font-extrabold">
              {data.user.name} {profile.verified && <VerifiedBadge />}
            </h1>
            <div className="mt-0.5 flex items-center gap-2">
              <Stars rating={profile.rating} count={profile.ratingCount} />
              <span className="text-xs text-slate-300">· {profile.skills.map((s) => getCategory(s)?.icon).join(" ")}</span>
            </div>
          </div>
          {profile.verified && (
            <button
              onClick={async () => {
                await workerAction({ action: "online", online: !profile.online });
                reload();
              }}
              className={`relative h-9 w-20 rounded-full text-xs font-bold transition ${profile.online ? "bg-emerald-500" : "bg-slate-600"}`}
            >
              <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${profile.online ? "left-12" : "left-1"}`} />
              <span className={profile.online ? "pr-7" : "pl-7"}>{profile.online ? "ONLINE" : "OFFLINE"}</span>
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 p-2"><p className="text-lg font-bold">₹{todayEarnings}</p><p className="text-[10px] text-slate-300">Today</p></div>
          <div className="rounded-xl bg-white/10 p-2"><p className="text-lg font-bold">{data.active.length}</p><p className="text-[10px] text-slate-300">Active</p></div>
          <div className="rounded-xl bg-white/10 p-2"><p className="text-lg font-bold">{data.history.filter((j) => j.status === "completed").length}</p><p className="text-[10px] text-slate-300">Completed</p></div>
        </div>
      </header>

      <div className="space-y-5 p-4">
        {!onboarding.complete && (
          <Link href="/worker/onboarding" className="block rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-bold text-amber-900">🪪 Complete verification to start receiving jobs</p>
            <p className="text-xs text-amber-800">Aadhaar · Police clearance · ITI / KWA licence · In-app quiz</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200">
              <div className="h-full bg-amber-500" style={{ width: `${(doneSteps / 5) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs font-semibold text-amber-900">{doneSteps}/5 steps done → Continue</p>
          </Link>
        )}

        {data.active.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-slate-700">Your active jobs</h2>
            <div className="space-y-2">
              {data.active.map((j) => (
                <Link key={j.id} href={`/worker/jobs/${j.id}`} className="block rounded-2xl border-2 border-teal-500 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{j.title}</p>
                    <StatusBadge status={j.status} />
                  </div>
                  <p className="line-clamp-1 text-xs text-slate-500">📍 {j.address}</p>
                  <p className="mt-1 text-xs font-semibold text-teal-700">Open job → {j.status === "assigned" ? "Enter PIN on arrival" : "Mark complete"}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {onboarding.complete && (
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              🛎️ Nearby job alerts
              {profile.online && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
            </h2>
            {!profile.online && <p className="rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-500">Go ONLINE to receive job alerts near you.</p>}
            {profile.online && profile.lat == null && <p className="rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-500">Waiting for your location…</p>}
            {profile.online && profile.lat != null && data.alerts.length === 0 && (
              <p className="rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-500">No matching requests nearby right now. We&apos;ll alert you here.</p>
            )}
            <div className="space-y-3">
              {data.alerts.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.services.map((s) => `${s.name} (${s.hours}h)`).join(" · ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-teal-700">₹{a.workerPay}</p>
                      <p className="text-[10px] text-slate-400">you earn · pays ₹{a.amount}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">📍 {a.distanceKm} km · ~{a.eta} min</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">{a.area}</span>
                    {a.clusterType === "household" && a.services.length > 1 && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-700">✨ Bundled</span>}
                    {a.surchargePct > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">+{a.surchargePct}% far-distance pay</span>}
                  </div>
                  <button
                    disabled={busy === a.id}
                    onClick={() => accept(a.id)}
                    className="mt-3 w-full rounded-xl bg-teal-600 py-2.5 font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {busy === a.id ? "Accepting…" : "Accept job"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
