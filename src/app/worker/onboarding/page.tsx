"use client";

import { useEffect, useState } from "react";
import { useWorker, workerAction } from "@/components/useWorker";
import { CATEGORIES } from "@/lib/catalog";

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border bg-white p-4 shadow-sm ${done ? "border-emerald-300" : "border-slate-200"}`}>
      <div className="mb-3 flex items-center gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"}`}>
          {done ? "✓" : n}
        </span>
        <h2 className="font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Upload({ type, label, hint, uploaded, onDone }: { type: string; label: string; hint?: string; uploaded?: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-sm font-semibold">{label}</p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      {uploaded && <p className="text-xs text-emerald-700">✓ Uploaded: {uploaded}</p>}
      <label className="mt-2 inline-block cursor-pointer rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
        {busy ? "Uploading…" : uploaded ? "Replace file" : "Upload PDF / photo"}
        <input
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            setErr(null);
            const fd = new FormData();
            fd.append("type", type);
            fd.append("file", f);
            const r = await fetch("/api/worker/documents", { method: "POST", body: fd });
            const d = await r.json();
            setBusy(false);
            if (!r.ok) setErr(d.error);
            onDone();
          }}
        />
      </label>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

export default function OnboardingPage() {
  const { data, reload } = useWorker();
  const [skills, setSkills] = useState<string[]>([]);
  const [profileName, setProfileName] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      setSkills(data.profile.skills);
      setProfileName(data.user.name === "Helper" ? "" : data.user.name);
    }
  }, [data]);

  if (!data) return <p className="p-6 text-center text-slate-400">Loading…</p>;
  const { steps, required, docs, complete } = data.onboarding;
  const docName = (t: string) => docs.find((d) => d.type === t)?.fileName;
  const profileDone = data.user.name !== "Helper" && profileName !== "";
  const needsElectrical = data.profile.skills.includes("electrical");
  const needsPlumbing = data.profile.skills.includes("plumbing");
  const quiz = data.quiz.filter((q) => !q.tag || data.profile.skills.includes(q.tag));

  const run = async (key: string, body: Record<string, unknown>) => {
    try {
      const d = await workerAction(body);
      setMsg((m) => ({ ...m, [key]: d.score != null ? `Score: ${d.score}% — ${d.passed ? "Passed 🎉" : "Not passed, need 70%. Try again."}` : "Saved ✓" }));
    } catch (e) {
      setMsg((m) => ({ ...m, [key]: (e as Error).message }));
    }
    reload();
  };

  return (
    <main>
      <header className="bg-white px-5 pt-5 pb-3 shadow-sm">
        <h1 className="text-xl font-extrabold">Worker verification</h1>
        <p className="text-xs text-slate-500">Complete every step to get the ✔ Verified badge and start receiving jobs.</p>
        {complete ? (
          <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm font-semibold text-emerald-800">🎉 You are verified! Go to Jobs and switch ONLINE.</p>
        ) : (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm font-semibold text-amber-800">⏳ Under Verification — admin approval pending until all steps are done.</p>
        )}
      </header>

      <div className="space-y-4 p-4">
        <Step n={0} title="General information" done={profileDone}>
          <div className="flex gap-2">
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Your full name"
              className="flex-1 rounded-lg border border-slate-300 p-2 text-sm"
            />
            <button onClick={() => run("profile", { action: "profile", name: profileName })} className="rounded-lg bg-teal-600 px-3 text-sm font-bold text-white">
              Save
            </button>
          </div>
          {msg.profile && <p className="mt-1 text-xs text-slate-600">{msg.profile}</p>}
        </Step>

        <Step n={1} title="Your skills" done={steps.skills}>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => {
              const on = skills.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setSkills(on ? skills.filter((s) => s !== c.id) : [...skills, c.id])}
                  className={`rounded-xl border-2 p-2 text-left text-sm ${on ? "border-teal-600 bg-teal-50" : "border-slate-200"}`}
                >
                  {c.icon} <b>{c.name}</b>
                  {c.license === "kseb" && <p className="text-[10px] text-slate-500">Needs KSEB Wireman Permit</p>}
                  {c.license === "plumbing" && <p className="text-[10px] text-slate-500">Needs ITI or KWA licence</p>}
                </button>
              );
            })}
          </div>
          <button onClick={() => run("skills", { action: "skills", skills })} className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white">
            Save skills
          </button>
          {msg.skills && <p className="mt-1 text-xs text-slate-600">{msg.skills}</p>}
        </Step>

        <Step n={2} title="Aadhaar verification" done={steps.aadhaar}>
          {data.profile.aadhaarVerified ? (
            <p className="mb-2 text-sm text-emerald-700">✓ Aadhaar XXXX XXXX {data.profile.aadhaarLast4} verified</p>
          ) : (
            <div className="mb-2 flex gap-2">
              <input
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/[^\d ]/g, "").slice(0, 14))}
                placeholder="12-digit Aadhaar number"
                inputMode="numeric"
                className="flex-1 rounded-lg border border-slate-300 p-2 text-sm"
              />
              <button onClick={() => run("aadhaar", { action: "aadhaar", number: aadhaar })} className="rounded-lg bg-teal-600 px-3 text-sm font-bold text-white">
                Verify
              </button>
            </div>
          )}
          {msg.aadhaar && <p className="mb-2 text-xs text-slate-600">{msg.aadhaar}</p>}
          <Upload type="aadhaar" label="Aadhaar card (front & back)" hint="Number is redacted — only the last 4 digits are stored." uploaded={docName("aadhaar")} onDone={reload} />
          <p className="mt-2 text-[11px] text-slate-400">Test number: 2341 2341 2346</p>
        </Step>

        <Step n={3} title="Police Clearance Certificate" done={steps.pcc}>
          <Upload type="pcc" label="Police Clearance Certificate" hint="Kerala Police / Thuna portal" uploaded={docName("pcc")} onDone={reload} />
        </Step>

        <Step n={4} title="Trade licences (prototype: electrical & plumbing)" done={steps.licences}>
          {!needsElectrical && !needsPlumbing ? (
            <p className="text-sm text-slate-500">Not required for your selected skills.</p>
          ) : (
            <div className="space-y-2">
              {needsElectrical && (
                <Upload type="kseb" label="KSEB Wireman Permit" hint="Kerala State Electricity Licensing Board — required for Electrical" uploaded={docName("kseb")} onDone={reload} />
              )}
              {needsPlumbing && (
                <>
                  <Upload type="iti" label="ITI Plumbing Certificate" hint="Either ITI or KWA licence is accepted for Plumbing" uploaded={docName("iti")} onDone={reload} />
                  <Upload type="kwa" label="KWA Plumber Licence" hint="Kerala Water Authority — alternative to ITI" uploaded={docName("kwa")} onDone={reload} />
                </>
              )}
            </div>
          )}
          {required.length > 0 && <p className="text-[11px] text-slate-400">Still needed: {required.map((r) => r.label).join(", ")}</p>}
        </Step>

        <Step n={5} title="In-app quiz (pass mark 70%)" done={steps.quiz}>
          {data.profile.quizScore != null && (
            <p className={`mb-2 text-sm font-semibold ${data.profile.quizPassed ? "text-emerald-700" : "text-red-600"}`}>
              Last score: {data.profile.quizScore}% {data.profile.quizPassed ? "— Passed" : "— Retake required"}
            </p>
          )}
          {!data.profile.quizPassed && (
            <div className="space-y-4">
              {quiz.map((q, i) => (
                <div key={q.id}>
                  <p className="text-sm font-semibold">{i + 1}. {q.q}</p>
                  <div className="mt-1 space-y-1">
                    {q.options.map((o, oi) => (
                      <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${answers[q.id] === oi ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>
                        <input type="radio" name={`q${q.id}`} checked={answers[q.id] === oi} onChange={() => setAnswers({ ...answers, [q.id]: oi })} />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => run("quiz", { action: "quiz", answers })}
                disabled={Object.keys(answers).length < quiz.length}
                className="w-full rounded-xl bg-teal-600 py-2.5 font-bold text-white disabled:opacity-40"
              >
                Submit quiz
              </button>
            </div>
          )}
          {msg.quiz && <p className="mt-2 text-sm text-slate-700">{msg.quiz}</p>}
        </Step>
      </div>
    </main>
  );
}
