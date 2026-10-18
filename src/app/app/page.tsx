"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import BookingSheet from "@/components/BookingSheet";
import { useSpeech } from "@/components/useSpeech";
import { CATEGORIES, getSub } from "@/lib/catalog";
import type { Selection } from "@/lib/cluster";

type Msg = { from: "ai" | "me"; text: string; subs?: string[]; engine?: string };

const SUGGESTIONS = [
  "Fan karangunnilla, current poyi",
  "Cooking and washing clothes for 2 hours",
  "Tap chorunnu, bathroom clean cheyyanam",
  "Pathram kazhukanam, podi thudakkanam, car kazhukanam",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: "ai",
      text: "Namaskaram! 🙏 I'm കൂട്ടായി. Tell me what you need — speak or type in English, Malayalam or Manglish. I'll find the right helper and bundle tasks into one visit.",
    },
  ]);
  const [input, setInput] = useState("");
  const [selections, setSelections] = useState<Selection[]>([]);
  const [lastRequest, setLastRequest] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [lang, setLang] = useState<"en-IN" | "ml-IN">("en-IN");
  const endRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [...m, { from: "me", text: t }]);
    setInput("");
    setThinking(true);
    setLastRequest((r) => (r ? `${r}. ${t}` : t));
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const matches: { subId: string; hours: number }[] = data.matches;
      setSelections((prev) => {
        const next = [...prev];
        for (const m of matches) if (!next.find((x) => x.subId === m.subId)) next.push({ subId: m.subId, hours: m.hours });
        return next;
      });
      setMessages((m) => [...m, { from: "ai", text: data.reply, subs: matches.map((x) => x.subId), engine: data.engine }]);
    } catch (e) {
      setMessages((m) => [...m, { from: "ai", text: (e as Error).message || "Something went wrong. Please try again." }]);
    } finally {
      setThinking(false);
    }
  }, []);

  const speech = useSpeech(send);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, speech.interim]);

  return (
    <main className="flex min-h-[calc(100vh-6rem)] flex-col">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-teal-700 to-teal-600 px-5 pt-5 pb-4 text-white shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold"><span lang="ml">കൂട്ടായി</span> Concierge</h1>
            <p className="text-xs text-teal-100">Say it your way — Manglish works too 🗣️</p>
          </div>
          <div className="flex rounded-full bg-white/15 p-0.5 text-[11px] font-semibold">
            {(["en-IN", "ml-IN"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full px-2.5 py-1 ${lang === l ? "bg-white text-teal-700" : "text-white"}`}
              >
                {l === "en-IN" ? "EN / Manglish" : "മലയാളം"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="flex-1 space-y-3 px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                m.from === "me" ? "rounded-br-sm bg-teal-600 text-white" : "rounded-bl-sm bg-white text-slate-800"
              }`}
            >
              <p>{m.text}</p>
              {m.subs && m.subs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.subs.map((s) => {
                    const sub = getSub(s);
                    return sub ? (
                      <span key={s} className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                        {sub.category.icon} {sub.category.name} › {sub.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              {m.engine && <p className="mt-1 text-[10px] text-slate-400">{m.engine === "ai" ? "AI model" : "Manglish keyword engine"}</p>}
            </div>
          </div>
        ))}
        {speech.interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal-100 px-4 py-2.5 text-sm italic text-teal-900">
              {speech.interim}…
            </div>
          </div>
        )}
        {thinking && (
          <div className="flex gap-1 px-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}

        {messages.length === 1 && (
          <div className="space-y-2 pt-2">
            <p className="px-1 text-xs font-semibold text-slate-500">Try saying:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-teal-400"
              >
                “{s}”
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </section>

      <div className="sticky bottom-[68px] z-20 space-y-2 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-4 pt-4 pb-2">
        {selections.length > 0 && (
          <button
            onClick={() => setSheet(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg"
          >
            <span className="text-sm">
              <b>{selections.length}</b> service{selections.length > 1 ? "s" : ""} selected
            </span>
            <span className="rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-bold">Review & Request →</span>
          </button>
        )}

        <div>
          <p className="mb-1 px-1 text-[11px] font-semibold text-slate-500">Don&apos;t want AI? Choose directly:</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={`/app/categories?cat=${c.id}`}
                className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm"
              >
                {c.icon} {c.name}
              </Link>
            ))}
          </div>
        </div>

        {speech.error && <p className="text-xs text-red-600">{speech.error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={speech.listening ? "Listening…" : "Type your need…"}
            className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
          />
          <button
            type="button"
            onClick={() => (speech.listening ? speech.stop() : speech.start(lang))}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-lg transition ${
              speech.listening ? "animate-pulse bg-red-500" : "bg-teal-600 hover:bg-teal-700"
            }`}
            aria-label="Speak"
            title={speech.supported ? "Tap to speak" : "Voice not supported in this browser"}
          >
            {speech.listening ? "■" : "🎤"}
          </button>
          {input.trim() && (
            <button className="h-12 rounded-full bg-slate-900 px-4 text-sm font-bold text-white">Send</button>
          )}
        </form>
      </div>

      {sheet && (
        <BookingSheet selections={selections} setSelections={setSelections} request={lastRequest} onClose={() => setSheet(false)} />
      )}
    </main>
  );
}
