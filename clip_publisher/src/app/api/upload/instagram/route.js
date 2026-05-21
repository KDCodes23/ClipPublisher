import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Step 1: Create Instagram media container.
// Instagram fetches the video from our Supabase Storage URL (same as TikTok).
// Processing can take 30–120s, so we return the creation_id immediately.
// The client polls /api/upload/instagram/publish to check status and publish.
export async function POST(request) {
  const { caption, storagePath } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token,platform_user_id")
    .eq("user_id", user.id)
    .eq("platform", "instagram")
    .single();

  if (!account?.platform_user_id) {
    return NextResponse.json(
      { error: "Instagram not connected or no Business account found" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { data: urlData, error: urlError } = await adminClient.storage
    .from("clips")
    .createSignedUrl(storagePath, 3600);

  if (urlError) {
    return NextResponse.json({ error: "Could not generate video URL" }, { status: 500 });
  }

  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${account.platform_user_id}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: urlData.signedUrl,
        caption,
        access_token: account.access_token,
      }),
    }
  );

  const containerData = await containerRes.json();
  if (!containerRes.ok || containerData.error) {
    return NextResponse.json(
      { error: containerData.error?.message ?? "Instagram container creation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ creation_id: containerData.id });
}
