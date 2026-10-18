"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BookingSheet, { PriceNote } from "@/components/BookingSheet";
import { CATEGORIES, WAGE_SOURCE_NOTE, fmt } from "@/lib/catalog";
import type { Selection } from "@/lib/cluster";

function licenseNote(c: { license?: string }) {
  if (c.license === "kseb") return " · KSEB Wireman Permit required";
  if (c.license === "plumbing") return " · ITI / KWA licence required";
  return "";
}

function CategoriesInner() {
  const params = useSearchParams();
  const [open, setOpen] = useState<string | null>(params.get("cat") ?? CATEGORIES[0].id);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [sheet, setSheet] = useState(false);

  // Re-booking from order history lands here with saved selections.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kootay_rebook");
      if (!raw) return;
      localStorage.removeItem("kootay_rebook");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        const validIds = new Set(CATEGORIES.flatMap((c) => c.subs.map((s) => s.id)));
        setSelections(
          arr
            .filter((x) => x && validIds.has(String(x.subId)))
            .map((x) => ({ subId: String(x.subId), hours: Math.max(1, Math.min(12, Number(x.hours) || 1)) })),
        );
      }
    } catch {}
  }, []);

  const toggle = (subId: string) =>
    setSelections((s) => (s.find((x) => x.subId === subId) ? s.filter((x) => x.subId !== subId) : [...s, { subId, hours: 1 }]));

  return (
    <main>
      <header className="sticky top-0 z-30 bg-white px-5 pt-5 pb-3 shadow-sm">
        <h1 className="text-xl font-extrabold">Categories</h1>
        <p className="text-xs text-slate-500">Pick services manually — or combine tasks into a bundle and save with the AI discount.</p>
      </header>

      <div className="space-y-3 p-4">
        {CATEGORIES.map((c) => {
          const isOpen = open === c.id;
          const count = selections.filter((s) => c.subs.some((x) => x.id === s.subId)).length;
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button onClick={() => setOpen(isOpen ? null : c.id)} className="flex w-full items-center gap-3 p-3 text-left">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-2xl`}>
                  {c.icon}
                </span>
                <div className="flex-1">
                  <p className="font-bold">
                    {c.name} <span className="text-xs font-normal text-slate-400">{c.ml}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.subs.length} services
                    {licenseNote(c)}
                    {c.cluster === "household" && " · can be bundled"}
                  </p>
                </div>
                {count > 0 && <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs font-bold text-white">{count}</span>}
                <span className={`text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
              </button>
              {isOpen && (
                <ul className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
                  {c.subs.map((s) => {
                    const sel = selections.some((x) => x.subId === s.id);
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => toggle(s.id)}
                          className={`h-full w-full rounded-xl border-2 p-2.5 text-left transition ${
                            sel ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <p className="text-sm font-semibold leading-tight">{s.name}</p>
                          <p className="text-[11px] text-slate-400">{s.ml} · Govt {s.govtRef}</p>
                          <p className="mt-1 text-xs font-bold text-teal-700">{fmt(s.initial)} 1st hr {sel && "✓"}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        <p className="px-1 text-[11px] text-slate-400">{WAGE_SOURCE_NOTE}</p>
        <PriceNote />
      </div>

      {selections.length > 0 && (
        <div className="fixed bottom-[72px] left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
          <button
            onClick={() => setSheet(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-xl"
          >
            <span className="text-sm">
              <b>{selections.length}</b> selected
            </span>
            <span className="rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-bold">Review & Request →</span>
          </button>
        </div>
      )}
      {sheet && <BookingSheet selections={selections} setSelections={setSelections} onClose={() => setSheet(false)} />}
    </main>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense>
      <CategoriesInner />
    </Suspense>
  );
}
