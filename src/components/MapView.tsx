"use client";

type Pt = { lat: number; lng: number };

/** Lightweight live map using the OpenStreetMap embed (no API key). */
export default function MapView({ home, worker, height = 220 }: { home: Pt; worker?: Pt | null; height?: number }) {
  const pts = worker ? [home, worker] : [home];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const pad = 0.01;
  const bbox = [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad]
    .map((n) => n.toFixed(5))
    .join(",");
  const marker = worker ?? home;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker.lat.toFixed(5)},${marker.lng.toFixed(5)}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <iframe key={src} title="Live map" src={src} style={{ height }} className="w-full" loading="lazy" />
      <div className="flex items-center justify-between bg-white px-3 py-1.5 text-[11px] text-slate-500">
        <span>📍 {worker ? "Marker = worker's live position" : "Your location"}</span>
        <a
          className="font-semibold text-teal-700"
          target="_blank"
          rel="noreferrer"
          href={
            worker
              ? `https://www.google.com/maps/dir/?api=1&origin=${worker.lat},${worker.lng}&destination=${home.lat},${home.lng}`
              : `https://www.google.com/maps?q=${home.lat},${home.lng}`
          }
        >
          Open in Maps ↗
        </a>
      </div>
    </div>
  );
}
