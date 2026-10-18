"use client";

import { useEffect, useRef, useState } from "react";

async function post(lat: number, lng: number) {
  await fetch("/api/worker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "location", lat, lng }),
  }).catch(() => {});
}

/** Shares the worker's live GPS location every ~8 seconds while the worker app is open. */
export default function LocationSharer() {
  const [status, setStatus] = useState<"pending" | "live" | "denied" | "manual">("pending");
  const last = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus("live");
        const now = Date.now();
        if (now - last.current < 8000) return;
        last.current = now;
        post(pos.coords.latitude, pos.coords.longitude);
      },
      () => setStatus((s) => (s === "manual" ? s : "denied")),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  if (status === "live")
    return (
      <div className="flex items-center justify-center gap-1.5 bg-emerald-600 py-1 text-[11px] font-medium text-white">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Sharing live location
      </div>
    );
  if (status === "manual")
    return <div className="bg-slate-700 py-1 text-center text-[11px] text-white">📍 Using demo location (Kochi)</div>;
  if (status === "denied")
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-500 py-1.5 text-[11px] font-medium text-white">
        Location off — customers can&apos;t track you.
        <button
          className="rounded bg-white/25 px-2 py-0.5 font-bold"
          onClick={async () => {
            await post(9.9816 + (Math.random() - 0.5) * 0.02, 76.2999 + (Math.random() - 0.5) * 0.02);
            setStatus("manual");
          }}
        >
          Use demo location
        </button>
      </div>
    );
  return null;
}
