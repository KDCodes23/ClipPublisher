import { NextResponse } from "next/server";

// Uses Facebook Login to get access to Instagram Content Publishing API.
// Requires the connected Instagram account to be a Business or Creator account
// linked to a Facebook Page.
export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/connect/instagram/callback`,
    scope: "instagram_basic,instagram_content_publish,pages_read_engagement",
    response_type: "code",
  });
  return NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params}`
  );
}
