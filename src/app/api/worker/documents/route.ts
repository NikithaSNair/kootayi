import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { json } from "@/lib/auth";
import { getWorker } from "@/lib/guest";
import { getOnboardingState } from "@/lib/worker";

export const dynamic = "force-dynamic";

const TYPES = new Set(["aadhaar", "pcc", "iti", "kwa"]);
const MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const user = await getWorker();
  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: "Invalid upload" }, 400);
  const type = String(form.get("type") || "");
  const file = form.get("file");
  if (!TYPES.has(type)) return json({ error: "Invalid document type" }, 400);
  if (!(file instanceof File) || file.size === 0) return json({ error: "Choose a file" }, 400);
  if (file.size > 3 * 1024 * 1024) return json({ error: "File must be under 3 MB" }, 400);
  if (!MIME.has(file.type)) return json({ error: "Upload a PDF, JPG, PNG or WEBP file" }, 400);
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  await db.delete(documents).where(and(eq(documents.userId, user.id), eq(documents.type, type)));
  await db.insert(documents).values({ userId: user.id, type, fileName: file.name.slice(0, 120), mimeType: file.type, data });
  await getOnboardingState(user.id);
  return json({ ok: true });
}
