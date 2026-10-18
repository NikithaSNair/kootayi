"use client";

import { useEffect, useState } from "react";
import KootayiLogo from "@/components/KootayiLogo";

type Stage = "choose" | "signup" | "address";

async function postMe(body: Record<string, unknown>) {
  const r = await fetch("/api/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

export default function RoleGate() {
  const [stage, setStage] = useState<Stage | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  // True when a saved role means we'll navigate away: keep the splash on screen
  // instead of flashing the chooser for a moment.
  const [redirecting, setRedirecting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [address, setAddress] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Where a returning user should land, or null to show the entry screens.
  const savedDestination = () => {
    const role = localStorage.getItem("kootay_role");
    if (role === "worker") return "/worker";
    if (role === "customer" && localStorage.getItem("kootay_profile") === "done") return "/app";
    return null;
  };

  useEffect(() => {
    const role = localStorage.getItem("kootay_role");
    const dest = savedDestination();
    if (dest) setRedirecting(true);
    setStage(role === "customer" && !dest ? "signup" : "choose");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 400 : 2600;
    const timer = window.setTimeout(() => {
      if (dest) window.location.replace(dest);
      else setShowIntro(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, []);

  const skipIntro = () => {
    const dest = savedDestination();
    if (dest) {
      setRedirecting(true);
      window.location.replace(dest);
      return;
    }
    setShowIntro(false);
  };

  const choose = (role: "customer" | "worker") => {
    localStorage.setItem("kootay_role", role);
    if (role === "worker") window.location.assign("/worker");
    else setStage("signup");
  };

  const finish = (withProfile: boolean) => {
    if (withProfile) localStorage.setItem("kootay_profile", "done");
    window.location.assign("/app");
  };

  const requestOtp = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return setError("Enter a valid 10-digit mobile number.");
    setBusy(true);
    try {
      const d = await postMe({ action: "request_otp", phone: digits });
      setOtpSent(d.demoOtp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    const digits = phone.replace(/\D/g, "").slice(-10);
    setBusy(true);
    try {
      await postMe({ action: "verify_otp", phone: digits, otp: otp.trim(), name: name.trim(), email: email.trim() });
      setVerified(true);
      setStage("address");
      detect();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const detect = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(p);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lng}`);
          const d = await r.json();
          if (d.display_name) setAddress((a) => a || d.display_name);
        } catch {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const saveAddress = async () => {
    setError(null);
    if (!address.trim()) return setError("Please enter your delivery address.");
    setBusy(true);
    try {
      await postMe({ action: "profile", address: address.trim() });
      finish(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (showIntro || redirecting || !stage) return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-teal-900 via-teal-700 to-emerald-500 px-5 text-white">
      <div className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-amber-200/20 blur-3xl" />
      <KootayiLogo />
      <p className="mt-4 text-center text-sm font-medium tracking-wide text-teal-50">
        {redirecting ? "Welcome back — opening your home screen…" : "Help, together. Right when you need it."}
      </p>
      <div className="absolute bottom-12 flex flex-col items-center gap-5">
        <div className="flex gap-2" aria-label="Loading">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white [animation-delay:200ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white [animation-delay:400ms]" />
        </div>
        <button type="button" onClick={skipIntro} className="rounded-full border border-white/40 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15">
          {redirecting ? "Continue now →" : "Skip intro →"}
        </button>
      </div>
    </main>
  );

  if (stage === "choose") {
    return (
      <main className="kootayi-screen flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-teal-700 via-teal-600 to-slate-50 px-6 py-10">
        <KootayiLogo compact />
        <p className="mt-1 text-sm text-teal-50">Help when you need it — no monthly salary.</p>
        <p className="text-xs text-teal-100">സഹായം, ആവശ്യമുള്ളപ്പോൾ മാത്രം</p>
        <div className="mt-8 grid w-full max-w-sm gap-3">
          <button onClick={() => choose("customer")} className="rounded-2xl bg-white p-5 text-left shadow-xl transition hover:scale-[1.02]">
            <span className="text-3xl">🏠</span>
            <p className="mt-1 text-lg font-extrabold">I Want to Book a Service</p>
            <p className="text-sm text-slate-500">Customer — cooks, cleaners, electricians & more</p>
          </button>
          <button onClick={() => choose("worker")} className="rounded-2xl bg-slate-900 p-5 text-left text-white shadow-xl transition hover:scale-[1.02]">
            <span className="text-3xl">🧑‍🔧</span>
            <p className="mt-1 text-lg font-extrabold">I Want to Work</p>
            <p className="text-sm text-slate-300">Worker — get verified & earn near you</p>
          </button>
        </div>
        <p className="mt-6 max-w-xs text-center text-[11px] text-teal-100">
          You can switch roles anytime from the bottom tabs.
        </p>
      </main>
    );
  }

  return (
    <main className="kootayi-screen min-h-screen bg-gradient-to-b from-teal-700 via-teal-600 to-slate-50 px-5 pt-12 pb-10">
      <div className="text-center text-white">
        <h1 className="text-3xl font-extrabold" lang="ml">കൂട്ടായി</h1>
        <p className="mt-1 text-sm text-teal-50">{stage === "signup" ? "Create your customer profile" : "Pin your delivery address"}</p>
      </div>
      <div className="mx-auto mt-6 max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        {stage === "signup" && !verified && (
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-teal-500" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email id (optional)" inputMode="email" autoComplete="email" className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-teal-500" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number (10 digits)" inputMode="numeric" autoComplete="tel" className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-teal-500" />
            {!otpSent ? (
              <button disabled={busy} onClick={requestOtp} className="w-full rounded-xl bg-teal-600 py-3 font-bold text-white disabled:opacity-50">
                {busy ? "Sending…" : "Send OTP"}
              </button>
            ) : (
              <>
                <p className="rounded-xl bg-amber-50 p-2 text-center text-sm text-amber-800">
                  Prototype demo code: <b className="font-mono text-lg">{otpSent}</b>
                </p>
                <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Enter 4-digit OTP" inputMode="numeric" className="w-full rounded-xl border border-slate-300 p-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-teal-500" />
                <button disabled={busy || otp.length !== 4} onClick={verify} className="w-full rounded-xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">
                  {busy ? "Verifying…" : "Verify & continue"}
                </button>
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={() => finish(false)} className="w-full py-2 text-sm font-semibold text-slate-500">Skip for now →</button>
          </div>
        )}
        {stage === "address" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Where should helpers come?</p>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="House name, street, landmark" className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-teal-500" />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{loc ? `📍 GPS pinned (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})` : "📍 Detecting GPS…"}</span>
              <button onClick={detect} className="font-semibold text-teal-700">Re-detect</button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={busy} onClick={saveAddress} className="w-full rounded-xl bg-teal-600 py-3 font-bold text-white disabled:opacity-50">
              {busy ? "Saving…" : "Start using കൂട്ടായി →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
