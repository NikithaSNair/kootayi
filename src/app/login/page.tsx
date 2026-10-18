import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Login was removed — send any old bookmarks straight into the app.
export default async function LoginPage() {
  redirect("/app");
}
