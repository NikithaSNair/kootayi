"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";

type OrderRow = {
  id: number;
  address: string;
  createdAt: string;
  request: string | null;
  jobs: { id: number; title: string; status: string; amount: number; worker: string | null; rating: number | null }[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  }, []);

  return (
    <main>
      <header className="sticky top-0 z-30 bg-white px-5 pt-5 pb-3 shadow-sm">
        <h1 className="text-xl font-extrabold">Order history</h1>
        <p className="text-xs text-slate-500">Track live orders and view past services</p>
      </header>
      <div className="space-y-3 p-4">
        {orders === null && <p className="text-center text-sm text-slate-400">Loading…</p>}
        {orders?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-4xl">📋</p>
            <p className="mt-2 font-semibold">No orders yet</p>
            <Link href="/app" className="mt-2 inline-block text-sm font-semibold text-teal-700">Ask the assistant →</Link>
          </div>
        )}
        {orders?.map((o) => (
          <Link key={o.id} href={`/app/orders/${o.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-300">
            <div className="flex items-center justify-between">
              <p className="font-bold">Order #{o.id}</p>
              <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            {o.request && <p className="mt-1 line-clamp-1 text-xs italic text-slate-500">“{o.request}”</p>}
            <ul className="mt-2 space-y-1.5">
              {o.jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{j.title}{j.worker && <span className="text-slate-400"> · {j.worker}</span>}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={j.status} />
                    <b>₹{j.amount}</b>
                  </span>
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </main>
  );
}
