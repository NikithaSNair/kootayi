import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";

export const dynamic = "force-dynamic";

// No login required — customers land here directly.
export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
