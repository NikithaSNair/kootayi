"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Assistant", icon: "🤖", exact: true },
  { href: "/app/categories", label: "Categories", icon: "🧰" },
  { href: "/app/orders", label: "Orders", icon: "📋" },
  { href: "/worker", label: "Worker", icon: "🧑‍🔧", exact: true },
  { href: "/app/profile", label: "Profile", icon: "👤" },
];

export const WORKER_TABS = [
  { href: "/worker", label: "Jobs", icon: "🛎️", exact: true },
  { href: "/worker/onboarding", label: "Verification", icon: "🪪" },
  { href: "/worker/history", label: "History", icon: "📋" },
  { href: "/app", label: "Customer", icon: "🏠", exact: true },
];

export function WorkerNav() {
  return <BottomNav tabs={WORKER_TABS} />;
}

export default function BottomNav({ tabs = TABS }: { tabs?: { href: string; label: string; icon: string; exact?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur">
      <ul className="flex">
        {tabs.map((t) => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                  active ? "text-teal-700" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className={`text-xl transition ${active ? "scale-110" : "opacity-70"}`}>{t.icon}</span>
                {t.label}
                {active && <span className="mt-0.5 h-1 w-6 rounded-full bg-teal-600" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
