import Link from "next/link";
import { PriceNote } from "@/components/BookingSheet";

export const dynamic = "force-dynamic";

// No login — profile is now a simple role switch + trust info.
export default async function ProfilePage() {
  return (
    <main className="p-5">
      <div className="rounded-3xl bg-gradient-to-br from-teal-700 to-teal-500 p-5 text-white shadow-lg">
        <p className="text-xl font-bold">Namaskaram 🙏</p>
        <p className="text-sm text-teal-100">No login needed — just tell us what you need.</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/app" className="rounded-2xl border-2 border-teal-600 bg-teal-50 p-4">
          <span className="text-2xl">🏠</span>
          <p className="mt-1 font-bold">I need help</p>
          <p className="text-[11px] text-slate-500">Book cooks, cleaners & more</p>
        </Link>
        <Link href="/worker" className="rounded-2xl border-2 border-slate-200 bg-white p-4 hover:border-slate-300">
          <span className="text-2xl">🧑‍🔧</span>
          <p className="mt-1 font-bold">I want work</p>
          <p className="text-[11px] text-slate-500">Get jobs near you</p>
        </Link>
      </div>

      <div className="mt-5 space-y-3 rounded-2xl bg-white p-4 text-sm shadow-sm">
        <h2 className="font-bold">How കൂട്ടായി keeps you safe</h2>
        <ul className="space-y-2 text-slate-600">
          <li>🪪 Every worker is Aadhaar verified & has a Police Clearance Certificate</li>
          <li>⚡ Electricians hold ITI certificates, 🔧 plumbers hold KWA licences</li>
          <li>📍 Live location tracking until the worker arrives</li>
          <li>🔐 Share your 4-digit PIN only when the worker is at your door</li>
          <li>💬 Extra charges need your approval in the app</li>
        </ul>
      </div>
      <PriceNote className="mt-4" />
    </main>
  );
}
