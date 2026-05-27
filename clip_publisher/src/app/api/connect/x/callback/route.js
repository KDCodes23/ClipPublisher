import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const cookieStore = await cookies();
  const savedState = cookieStore.get("x_state")?.value;
  const codeVerifier = cookieStore.get("x_code_verifier")?.value;

  if (!code || !state || state !== savedState || !codeVerifier) {
    return NextResponse.redirect(`${baseUrl}/account?error=x_auth_failed`);
  }

  cookieStore.delete("x_state");
  cookieStore.delete("x_code_verifier");

  // Exchange code for tokens
  const credentials = Buffer.from(
    `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl}/api/connect/x/callback`,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/account?error=x_token_failed`);
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json();

  // Fetch the authenticated user's info
  const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=username,name", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const { data: xUser } = await userRes.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${baseUrl}/login`);

  const expiresAt = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : null;

  await supabase.from("connected_accounts").upsert(
    {
      user_id: user.id,
      platform: "x",
      access_token,
      refresh_token: refresh_token ?? null,
      expires_at: expiresAt,
      platform_user_id: xUser?.id ?? null,
      platform_username: xUser?.username ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${baseUrl}/account?connected=X`);
}
