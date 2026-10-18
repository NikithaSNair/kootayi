"use client";

import { useCallback, useEffect, useState } from "react";

export type WorkerData = {
  user: { id: number; name: string; phone: string };
  profile: {
    skills: string[];
    verified: boolean;
    online: boolean;
    aadhaarLast4: string | null;
    aadhaarVerified: boolean;
    quizScore: number | null;
    quizPassed: boolean;
    lat: number | null;
    lng: number | null;
    rating: number | null;
    ratingCount: number;
  };
  onboarding: {
    steps: { skills: boolean; aadhaar: boolean; pcc: boolean; licences: boolean; quiz: boolean };
    complete: boolean;
    required: { type: string; label: string }[];
    docs: { type: string; fileName: string; createdAt: string }[];
  };
  quiz: { id: number; q: string; options: string[]; tag?: string }[];
  alerts: {
    id: number;
    title: string;
    clusterType: string;
    services: { name: string; hours: number }[];
    radiusKm: number;
    surchargePct: number;
    travelFee: number;
    amount: number;
    workerPay: number;
    area: string;
    distanceKm: number;
    eta: number;
  }[];
  active: WorkerJobRow[];
  history: WorkerJobRow[];
};

export type WorkerJobRow = {
  id: number;
  title: string;
  status: string;
  services: { name: string; hours: number }[];
  address: string;
  amount: number;
  rating: number | null;
  createdAt: string;
  completedAt: string | null;
};

export function useWorker(pollMs = 0) {
  const [data, setData] = useState<WorkerData | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/worker", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, []);
  useEffect(() => {
    load();
    if (!pollMs) return;
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);
  return { data, reload: load };
}

export async function workerAction(body: Record<string, unknown>) {
  const r = await fetch("/api/worker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Failed");
  return d;
}
