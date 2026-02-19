import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { syncEmails } from "@/lib/gmail";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncEmails(auth.userId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Sync error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to sync emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
