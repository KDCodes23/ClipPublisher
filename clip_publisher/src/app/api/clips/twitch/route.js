import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function refreshTwitchToken(supabase, userId, refreshToken) {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;

  const { access_token, refresh_token, expires_in } = await res.json();
  const expiresAt = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : null;

  await supabase.from("connected_accounts").update({
    access_token,
    refresh_token: refresh_token ?? refreshToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId).eq("platform", "twitch");

  return access_token;
}

export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token, refresh_token, expires_at, platform_user_id")
    .eq("user_id", user.id)
    .eq("platform", "twitch")
    .single();

  if (!account) {
    return NextResponse.json({ error: "Twitch not connected" }, { status: 400 });
  }

  let { access_token, refresh_token, expires_at, platform_user_id } = account;

  // Refresh token if expired or close to expiry (within 5 minutes)
  if (expires_at && new Date(expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
    access_token = await refreshTwitchToken(supabase, user.id, refresh_token);
    if (!access_token) {
      return NextResponse.json({ error: "Failed to refresh Twitch token" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const cursor = searchParams.get("cursor") || null;

  const params = new URLSearchParams({
    broadcaster_id: platform_user_id,
    first: String(limit),
  });
  if (cursor) params.set("after", cursor);

  const clipsRes = await fetch(
    `https://api.twitch.tv/helix/clips?${params}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Client-Id": process.env.TWITCH_CLIENT_ID,
      },
    }
  );

  if (!clipsRes.ok) {
    return NextResponse.json({ error: "Failed to fetch clips from Twitch" }, { status: 502 });
  }

  const { data: clips, pagination } = await clipsRes.json();

  // Normalize to a consistent shape
  const normalized = clips.map((c) => ({
    id: c.id,
    title: c.title,
    url: c.url,
    thumbnailUrl: c.thumbnail_url,
    // Twitch thumbnail URLs follow pattern: ...-preview-480x272.jpg
    // Replace -preview-480x272.jpg with .mp4 to get the direct video URL
    videoUrl: c.thumbnail_url.replace(/-preview-\d+x\d+\.jpg$/, ".mp4"),
    duration: c.duration,
    viewCount: c.view_count,
    createdAt: c.created_at,
    creatorName: c.creator_name,
    gameId: c.game_id,
  }));

  return NextResponse.json({
    clips: normalized,
    cursor: pagination?.cursor ?? null,
  });
}
