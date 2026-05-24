import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function base64url(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL));

  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/account?error=twitch_not_configured", process.env.NEXT_PUBLIC_BASE_URL)
    );
  }

  const state = base64url(crypto.randomBytes(16));
  const cookieStore = cookies();
  cookieStore.set("twitch_state", state, { httpOnly: true, secure: true, maxAge: 600, path: "/" });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/twitch/callback`,
    response_type: "code",
    scope: "clips:edit user:read:email",
    state,
  });

  return NextResponse.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`);
}
