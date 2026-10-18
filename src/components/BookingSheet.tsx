"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCATION,
  DEFAULT_RADIUS_KM,
  PLATFORM_FEE_PCT,
  PRICE_NOTE,
  WAGE_SOURCE_NOTE,
  fmt,
  getSub,
} from "@/lib/catalog";
import { clusterServices, type Selection } from "@/lib/cluster";

export function PriceNote({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ${className}`}>
      <p><b>Note:</b> {PRICE_NOTE}</p>
      <p className="mt-1 text-[10px] text-amber-700">{WAGE_SOURCE_NOTE}</p>
    </div>
  );
}

export function SelectionList({
  selections,
  setSelections,
}: {
  selections: Selection[];
  setSelections: (s: Selection[]) => void;
}) {
  return (
    <ul className="space-y-2">
      {selections.map((s) => {
        const sub = getSub(s.subId);
        if (!sub) return null;
        const update = (h: number) =>
          setSelections(selections.map((x) => (x.subId === s.subId ? { ...x, hours: Math.max(1, Math.min(12, h)) } : x)));
        return (
          <li key={s.subId} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
            <span className="text-xl">{sub.category.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{sub.name}</p>
              <p className="text-[11px] text-slate-500">
                {sub.category.name} · ₹{sub.initial} 1st hr · ₹{sub.subsequent} after
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => update(s.hours - 1)} className="h-7 w-7 rounded-full bg-slate-100 font-bold">−</button>
              <span className="w-10 text-center text-sm font-semibold">{s.hours}h</span>
              <button onClick={() => update(s.hours + 1)} className="h-7 w-7 rounded-full bg-slate-100 font-bold">+</button>
            </div>
            <button
              onClick={() => setSelections(selections.filter((x) => x.subId !== s.subId))}
              className="ml-1 text-slate-400 hover:text-red-500"
              aria-label="Remove"
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function BookingSheet({
  selections,
  setSelections,
  request,
  onClose,
}: {
  selections: Selection[];
  setSelections: (s: Selection[]) => void;
  request?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const jobs = useMemo(() => clusterServices(selections), [selections]);
  const grandTotal = jobs.reduce((a, j) => a + j.total, 0);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [locStatus, setLocStatus] = useState("Detecting your location…");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = () => {
    if (!navigator.geolocation) {
      setLoc(DEFAULT_LOCATION);
      setAddress((a) => a || DEFAULT_LOCATION.address);
      setLocStatus("GPS unavailable — using Kochi as default.");
      return;
    }
    setLocStatus("Detecting your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(p);
        setLocStatus(`GPS location captured (±${Math.round(pos.coords.accuracy)} m)`);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lng}`);
          const d = await r.json();
          if (d.display_name) setAddress((a) => a || d.display_name);
        } catch {}
      },
      () => {
        setLoc(DEFAULT_LOCATION);
        setAddress((a) => a || DEFAULT_LOCATION.address);
        setLocStatus("Location permission denied — using Kochi as default.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  useEffect(detect, []);

  const submit = async () => {
    if (!loc) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections, request, address, lat: loc.lat, lng: loc.lng }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setError(data.error || "Something went wrong");
    router.push(`/app/orders/${data.orderId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-slate-50 p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Review & request</h2>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>

        <SelectionList selections={selections} setSelections={setSelections} />

        {jobs.length > 0 && (
          <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-teal-800">✨ Smart clustering — itemized bill</p>
            <ul className="space-y-2">
              {jobs.map((j, i) => (
                <li key={i} className="rounded-xl bg-white p-2.5 text-sm shadow-sm">
                  <p className="font-semibold">
                    Visit {i + 1}: {j.title}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                    {j.services.map((s) => (
                      <li key={s.subId} className="flex justify-between">
                        <span>{s.name} · {s.hours}h</span>
                        <span>{fmt(s.base)}</span>
                      </li>
                    ))}
                  </ul>
                  {j.discount > 0 && (
                    <p className="flex justify-between text-xs font-semibold text-emerald-700">
                      <span>AI bundle discount</span>
                      <span>−{fmt(j.discount)}</span>
                    </p>
                  )}
                  <p className="flex justify-between text-xs text-slate-500">
                    <span>Worker base (Kerala Govt baseline)</span>
                    <span>{fmt(j.feeBase)}</span>
                  </p>
                  <p className="flex justify-between text-xs text-slate-500">
                    <span>കൂട്ടായി service fee ({PLATFORM_FEE_PCT}%)</span>
                    <span>{fmt(j.platformFee)}</span>
                  </p>
                  <p className="mt-1 flex justify-between border-t border-slate-100 pt-1 font-bold">
                    <span>Visit total</span>
                    <span>{fmt(j.total)}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    ~{j.totalHours} hr · {j.clusterType === "household" ? "1 multi-skilled helper" : "certified professional"}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-teal-800">
              Bundled tasks save travel & dispatch cost — you get {jobs.some((j) => j.discount > 0) ? "a bundle discount" : "one visit per trade"} and the worker earns more per visit.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <label className="text-sm font-semibold">Service address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            placeholder="House name, street, landmark"
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-teal-500"
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>📍 {locStatus}</span>
            <button onClick={detect} className="font-semibold text-teal-700">Re-detect</button>
          </div>
          <p className="text-xs text-slate-500">
            We alert verified workers within <b>{DEFAULT_RADIUS_KM} km</b>. If none are free, we&apos;ll ask before expanding to 10 km (+₹40 travel fee).
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white">
          <div>
            <p className="text-xs text-slate-300">Total payable</p>
            <p className="text-2xl font-bold">{fmt(grandTotal)}</p>
          </div>
          <button
            disabled={!selections.length || !loc || !address.trim() || submitting}
            onClick={submit}
            className="rounded-xl bg-teal-500 px-5 py-3 font-bold text-white transition hover:bg-teal-400 disabled:opacity-40"
          >
            {submitting ? "Requesting…" : "Request now"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <PriceNote className="mt-4" />
      </div>
    </div>
  );
}
