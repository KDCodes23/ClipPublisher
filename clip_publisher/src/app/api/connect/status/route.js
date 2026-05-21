import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ connected: {} }, { status: 401 });

  const { data } = await supabase
    .from("connected_accounts")
    .select("platform,platform_username,expires_at")
    .eq("user_id", user.id);

  const connected = {};
  for (const account of data ?? []) {
    connected[account.platform] = {
      username: account.platform_username,
      expires_at: account.expires_at,
    };
  }

  return NextResponse.json({ connected });
}
