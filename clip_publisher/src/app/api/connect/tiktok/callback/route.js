import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  if (error || !code) {
    return NextResponse.redirect(`${base}/account?error=tiktok_denied`);
  }

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${base}/api/connect/tiktok/callback`,
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok || tokens.error) {
    return NextResponse.redirect(`${base}/account?error=tiktok_failed`);
  }

  const userRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const userData = await userRes.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  await supabase.from("connected_accounts").upsert(
    {
      user_id: user.id,
      platform: "tiktok",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      platform_user_id: userData.data?.user?.open_id ?? null,
      platform_username: userData.data?.user?.display_name ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${base}/account?connected=tiktok`);
}
