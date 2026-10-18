import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { json } from "@/lib/auth";
import { CUSTOMER_COOKIE, getCustomer } from "@/lib/guest";

export const dynamic = "force-dynamic";

// Prototype OTP store (in-memory). Production: real SMS OTP provider.
const otpStore = new Map<string, { code: string; expires: number }>();

export async function GET() {
  const c = await getCustomer();
  const [row] = await db
    .select({ id: users.id, name: users.name, phone: users.phone, email: users.email, address: users.address })
    .from(users)
    .where(eq(users.id, c.id))
    .limit(1);
  return json({ customer: row ?? c });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "request_otp") {
    const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) return json({ error: "Enter a valid 10-digit mobile number." }, 400);
    const code = String(Math.floor(1000 + Math.random() * 9000));
    otpStore.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 });
    // Prototype: the code is returned so testers can enter it (no SMS provider yet).
    return json({ ok: true, demoOtp: code, note: "Prototype mode — no SMS sent. Enter the code shown." });
  }

  if (action === "verify_otp") {
    const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
    const otp = String(body.otp || "").trim();
    const rec = otpStore.get(phone);
    if (!rec || rec.expires < Date.now()) return json({ error: "Code expired. Request a new one." }, 400);
    if (rec.code !== otp) return json({ error: "Incorrect code. Try again." }, 400);
    otpStore.delete(phone);
    const me = await getCustomer();
    const name = String(body.name || "").trim().slice(0, 80) || (me.name === "Guest" ? "Customer" : me.name);
    const email = String(body.email || "").trim().slice(0, 120) || null;
    // If this phone already belongs to another profile, adopt it.
    const [other] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    if (other && other.id !== me.id) {
      await db.update(users).set({ name, email }).where(eq(users.id, other.id));
      (await cookies()).set(CUSTOMER_COOKIE, String(other.id), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return json({ ok: true, adopted: true });
    }
    try {
      await db.update(users).set({ phone, name, email }).where(eq(users.id, me.id));
    } catch {
      return json({ error: "This number is already in use on another device profile." }, 409);
    }
    return json({ ok: true });
  }

  if (action === "profile") {
    const me = await getCustomer();
    const patch: { name?: string; email?: string | null; address?: string | null } = {};
    if (body.name != null) {
      const name = String(body.name).trim().slice(0, 80);
      if (!name) return json({ error: "Enter your name." }, 400);
      patch.name = name;
    }
    if (body.email != null) patch.email = String(body.email).trim().slice(0, 120) || null;
    if (body.address != null) patch.address = String(body.address).trim().slice(0, 500) || null;
    if (!Object.keys(patch).length) return json({ error: "Nothing to save." }, 400);
    await db.update(users).set(patch).where(eq(users.id, me.id));
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
}
