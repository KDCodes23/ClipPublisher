import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function refreshYouTubeToken(supabase, userId, refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) return null;

  await supabase
    .from("connected_accounts")
    .update({
      access_token: data.access_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("platform", "youtube");

  return data.access_token;
}

// Returns a Google resumable upload URL. The client PUTs the video directly
// to that URL, bypassing Vercel's 4.5 MB body limit.
export async function POST(request) {
  const { title, description, tags, contentType, fileSize } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token,refresh_token,expires_at")
    .eq("user_id", user.id)
    .eq("platform", "youtube")
    .single();

  if (!account) {
    return NextResponse.json({ error: "YouTube not connected" }, { status: 400 });
  }

  let accessToken = account.access_token;
  const isExpired = account.expires_at && new Date(account.expires_at) < new Date(Date.now() + 60_000);
  if (isExpired && account.refresh_token) {
    accessToken = await refreshYouTubeToken(supabase, user.id, account.refresh_token);
    if (!accessToken) {
      return NextResponse.json({ error: "YouTube token expired. Please reconnect." }, { status: 401 });
    }
  }

  const metadata = {
    snippet: {
      title: title.slice(0, 100),
      description,
      tags: tags ?? [],
      categoryId: "20", // Gaming
    },
    status: {
      privacyStatus: "public",
      selfDeclaredMadeForKids: false,
    },
  };

  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": contentType,
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.error?.message ?? "Failed to initiate YouTube upload" },
      { status: 500 }
    );
  }

  const uploadUrl = initRes.headers.get("location");
  return NextResponse.json({ uploadUrl });
}
