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

  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/account?error=x_not_configured", process.env.NEXT_PUBLIC_BASE_URL)
    );
  }

  // Generate PKCE code_verifier and code_challenge
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  const state = base64url(crypto.randomBytes(16));

  const cookieStore = cookies();
  cookieStore.set("x_code_verifier", codeVerifier, { httpOnly: true, secure: true, maxAge: 600, path: "/" });
  cookieStore.set("x_state", state, { httpOnly: true, secure: true, maxAge: 600, path: "/" });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/connect/x/callback`,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
}
