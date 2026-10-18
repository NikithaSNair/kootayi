import { ALL_SUBS, CATEGORIES } from "./catalog";

export type ClassifyResult = {
  matches: { subId: string; hours: number; confidence: number }[];
  reply: string;
  engine: "ai" | "keywords";
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function extractHours(text: string): number | null {
  const m = text.match(/(\d{1,2})\s*(hours?|hrs?|hr|manikkoor|manikoor|manikkur|mani|മണിക്കൂർ)/i);
  if (m) return Math.min(12, Math.max(1, parseInt(m[1], 10)));
  return null;
}

export function keywordClassify(text: string): ClassifyResult {
  const t = ` ${normalize(text)} `;
  const scored: { subId: string; score: number }[] = [];
  for (const sub of ALL_SUBS) {
    let score = 0;
    for (const kw of sub.keywords) {
      // "=word" means exact whole-word match only (avoids "choru" matching "chorunnu")
      const exact = kw.startsWith("=");
      const k = normalize(exact ? kw.slice(1) : kw);
      if (!k) continue;
      const isAscii = /^[\x00-\x7f]+$/.test(k);
      if (isAscii) {
        const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // short / exact keywords: whole word (optional plural s); others: prefix match ("pathram" ~ "pathrangal")
        const re = exact || k.length <= 3 ? new RegExp(`(^|\\s)${esc}s?(\\s|$)`, "i") : new RegExp(`(^|\\s)${esc}`, "i");
        if (re.test(t)) score += k.includes(" ") ? 3 : 2;
      } else if (t.includes(k)) score += 2;
    }
    if (score > 0) scored.push({ subId: sub.id, score });
  }

  // "kazhuk" (wash) disambiguation: with vehicle words → vehicle; with pathram → utensils
  const hours = extractHours(text) ?? 1;
  // Keep the best match per sub; drop weak generic ones if stronger matches in same category exist
  scored.sort((a, b) => b.score - a.score);
  const best = scored.slice(0, 6);
  const matches = best.map((s) => ({
    subId: s.subId,
    hours,
    confidence: Math.min(0.95, 0.5 + s.score * 0.1),
  }));

  // Remove generic trade fallbacks (e.g. 'electrician', 'plumber') when a specific one in same category exists
  const generic = new Set(["appliance_install", "motor_pump"]);
  const filtered = matches.filter((m) => {
    if (!generic.has(m.subId)) return true;
    const cat = ALL_SUBS.find((s) => s.id === m.subId)!.categoryId;
    const others = matches.filter(
      (o) => o.subId !== m.subId && ALL_SUBS.find((s) => s.id === o.subId)!.categoryId === cat,
    );
    const own = scored.find((s) => s.subId === m.subId)!.score;
    return !(others.length > 0 && own <= 2);
  });

  const reply = filtered.length
    ? `I found ${filtered.length} service${filtered.length > 1 ? "s" : ""} for you. Review them below — you can add, remove or change hours before requesting.`
    : "Sorry, I couldn't understand that. Try saying something like “fan karangunnilla” or “cooking and washing clothes”, or pick from Categories below.";
  return { matches: filtered, reply, engine: "keywords" };
}

export async function classify(text: string): Promise<ClassifyResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return keywordClassify(text);

  const catalog = CATEGORIES.map(
    (c) => `${c.name}: ${c.subs.map((s) => `${s.id} (${s.name})`).join(", ")}`,
  ).join("\n");
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              `You classify home-service requests from Kerala users. Input can be English, Malayalam script or Manglish (Malayalam typed in English letters, e.g. "fan karangunnilla" = fan not spinning, "pathram kazhukanam" = need to wash utensils, "thuni alakkanam" = wash clothes, "tap chorunnu" = tap leaking, "current poyi" = power gone).\n` +
              `Available sub-category ids:\n${catalog}\n` +
              `Return JSON: {"matches":[{"subId":string,"hours":number,"confidence":number}],"reply":string}. hours = estimated hours (integer 1-12, use the user's stated duration if given, else 1). Only use ids from the list. reply = one short friendly English sentence; if nothing matches ask a clarifying question.`,
          },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    const valid = new Set(ALL_SUBS.map((s) => s.id));
    const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
      .filter((m: { subId: string }) => valid.has(m.subId))
      .map((m: { subId: string; hours?: number; confidence?: number }) => ({
        subId: m.subId,
        hours: Math.max(1, Math.min(12, Math.round(Number(m.hours) || 1))),
        confidence: Number(m.confidence) || 0.8,
      }));
    if (!matches.length) {
      const kw = keywordClassify(text);
      if (kw.matches.length) return kw;
    }
    return { matches, reply: String(parsed.reply || ""), engine: "ai" };
  } catch {
    return keywordClassify(text);
  }
}
