"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { useWorker } from "@/components/useWorker";

export default function WorkerHistory() {
  const { data } = useWorker();
  if (!data) return <p className="p-6 text-center text-slate-400">Loading…</p>;
  const earned = data.history.filter((j) => j.status === "completed").reduce((a, j) => a + j.amount, 0);
  return (
    <main>
      <header className="bg-white px-5 pt-5 pb-3 shadow-sm">
        <h1 className="text-xl font-extrabold">Job history</h1>
        <p className="text-sm text-slate-500">
          Total earned: <b className="text-teal-700">₹{earned}</b>
        </p>
      </header>
      <div className="space-y-2 p-4">
        {data.history.length === 0 && <p className="rounded-xl bg-slate-100 p-6 text-center text-sm text-slate-500">No past jobs yet.</p>}
        {data.history.map((j) => (
          <Link key={j.id} href={`/worker/jobs/${j.id}`} className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-bold">{j.title}</p>
              <b>₹{j.amount}</b>
            </div>
            <p className="line-clamp-1 text-xs text-slate-500">{j.address}</p>
            <div className="mt-1 flex items-center justify-between">
              <StatusBadge status={j.status} />
              <span className="text-xs text-amber-600">{j.rating ? "★".repeat(j.rating) : ""}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
