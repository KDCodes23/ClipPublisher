import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  if (error || !code) {
    return NextResponse.redirect(`${base}/account?error=instagram_denied`);
  }

  // Short-lived token
  const tokenRes = await fetch(
    "https://graph.facebook.com/v21.0/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: `${base}/api/connect/instagram/callback`,
        code,
      }),
    }
  );
  const tokens = await tokenRes.json();
  if (!tokenRes.ok || tokens.error) {
    return NextResponse.redirect(`${base}/account?error=instagram_failed`);
  }

  // Exchange for long-lived token (60-day expiry)
  const longRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokens.access_token}`
  );
  const longToken = await longRes.json();
  const accessToken = longToken.access_token ?? tokens.access_token;
  const expiresIn = longToken.expires_in ?? null;

  // Find the connected Instagram Business Account via the user's Facebook Pages
  let igUserId = null;
  let igUsername = null;

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
  );
  const pagesData = await pagesRes.json();
  const page = pagesData.data?.[0];

  if (page) {
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
    );
    const igData = await igRes.json();
    igUserId = igData.instagram_business_account?.id ?? null;

    if (igUserId) {
      const igUserRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}?fields=username&access_token=${accessToken}`
      );
      const igUser = await igUserRes.json();
      igUsername = igUser.username ?? null;
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  await supabase.from("connected_accounts").upsert(
    {
      user_id: user.id,
      platform: "instagram",
      access_token: accessToken,
      refresh_token: null,
      expires_at: expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null,
      platform_user_id: igUserId,
      platform_username: igUsername,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${base}/account?connected=instagram`);
}
