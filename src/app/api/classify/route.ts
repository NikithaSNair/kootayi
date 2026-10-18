import { json } from "@/lib/auth";
import { classify } from "@/lib/classify";

export const dynamic = "force-dynamic";

// No login required.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim().slice(0, 1000);
  if (!text) return json({ error: "Please say or type what you need" }, 400);
  const result = await classify(text);
  return json(result);
}
