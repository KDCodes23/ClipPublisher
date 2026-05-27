import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const cookieStore = await cookies();
  const savedState = cookieStore.get("twitch_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${baseUrl}/account?error=twitch_auth_failed`);
  }

  cookieStore.delete("twitch_state");

  // Exchange code for tokens
  const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${baseUrl}/api/connect/twitch/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/account?error=twitch_token_failed`);
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json();

  // Fetch the authenticated Twitch user
  const userRes = await fetch("https://api.twitch.tv/helix/users", {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID,
    },
  });

  const { data: twitchUsers } = await userRes.json();
  const twitchUser = twitchUsers?.[0];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${baseUrl}/login`);

  const expiresAt = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : null;

  await supabase.from("connected_accounts").upsert(
    {
      user_id: user.id,
      platform: "twitch",
      access_token,
      refresh_token: refresh_token ?? null,
      expires_at: expiresAt,
      platform_user_id: twitchUser?.id ?? null,
      platform_username: twitchUser?.login ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${baseUrl}/account?connected=Twitch`);
}
