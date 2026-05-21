import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Step 2: Check container status and publish when ready.
// Client calls this endpoint every few seconds until status is "done" or "error".
export async function POST(request) {
  const { creation_id } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token,platform_user_id")
    .eq("user_id", user.id)
    .eq("platform", "instagram")
    .single();

  if (!account) return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });

  const statusRes = await fetch(
    `https://graph.facebook.com/v21.0/${creation_id}?fields=status_code&access_token=${account.access_token}`
  );
  const statusData = await statusRes.json();

  if (statusData.status_code === "ERROR" || statusData.error) {
    return NextResponse.json(
      { error: statusData.error?.message ?? "Instagram processing failed" },
      { status: 500 }
    );
  }

  if (statusData.status_code !== "FINISHED") {
    return NextResponse.json({ status: "processing" });
  }

  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${account.platform_user_id}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id,
        access_token: account.access_token,
      }),
    }
  );

  const publishData = await publishRes.json();
  if (!publishRes.ok || publishData.error) {
    return NextResponse.json(
      { error: publishData.error?.message ?? "Instagram publish failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "done", media_id: publishData.id });
}
