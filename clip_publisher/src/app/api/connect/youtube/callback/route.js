import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  if (error || !code) {
    return NextResponse.redirect(`${base}/account?error=youtube_denied`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${base}/api/connect/youtube/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/account?error=youtube_failed`);
  }

  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const channelData = await channelRes.json();
  const channel = channelData.items?.[0];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  await supabase.from("connected_accounts").upsert(
    {
      user_id: user.id,
      platform: "youtube",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      platform_user_id: channel?.id ?? null,
      platform_username: channel?.snippet?.title ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${base}/account?connected=youtube`);
}
