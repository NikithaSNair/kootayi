const MAP: Record<string, { label: string; cls: string }> = {
  searching: { label: "Searching", cls: "bg-amber-100 text-amber-800" },
  assigned: { label: "Worker on the way", cls: "bg-blue-100 text-blue-800" },
  in_progress: { label: "In progress", cls: "bg-violet-100 text-violet-800" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelled", cls: "bg-slate-200 text-slate-600" },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, cls: "bg-slate-100" };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
      ✔ Verified
    </span>
  );
}

export function Stars({ rating, count }: { rating: number | null; count?: number }) {
  if (rating == null) return <span className="text-xs text-slate-400">New</span>;
  return (
    <span className="text-xs font-semibold text-amber-600">
      ★ {rating.toFixed(1)}
      {count != null && <span className="font-normal text-slate-400"> ({count})</span>}
    </span>
  );
}
