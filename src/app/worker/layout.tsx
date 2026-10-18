import type { ReactNode } from "react";
import { WorkerNav } from "@/components/BottomNav";
import LocationSharer from "@/components/LocationSharer";

export const dynamic = "force-dynamic";

// No login required — helpers land here directly.
export default async function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40">
        <LocationSharer />
      </div>
      {children}
      <WorkerNav />
    </div>
  );
}
