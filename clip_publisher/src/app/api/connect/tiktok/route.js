import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/connect/tiktok/callback`,
    response_type: "code",
    scope: "video.upload,video.publish",
  });
  return NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params}`
  );
}
