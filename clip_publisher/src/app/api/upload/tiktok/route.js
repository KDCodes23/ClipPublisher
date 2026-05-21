import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// TikTok PULL_FROM_URL: TikTok fetches the video from our Supabase Storage URL.
// The signed URL is valid for 1 hour — enough time for TikTok to pull the video.
export async function POST(request) {
  const { caption, storagePath } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("platform", "tiktok")
    .single();

  if (!account) {
    return NextResponse.json({ error: "TikTok not connected" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: urlData, error: urlError } = await adminClient.storage
    .from("clips")
    .createSignedUrl(storagePath, 3600);

  if (urlError) {
    return NextResponse.json({ error: "Could not generate video URL" }, { status: 500 });
  }

  const postRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: urlData.signedUrl,
        },
      }),
    }
  );

  const postData = await postRes.json();
  if (!postRes.ok || postData.error?.code !== "ok") {
    return NextResponse.json(
      { error: postData.error?.message ?? "TikTok upload failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, publish_id: postData.data?.publish_id });
}
