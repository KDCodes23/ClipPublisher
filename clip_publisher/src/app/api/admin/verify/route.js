import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { token, passphrase } = await request.json();

  const validToken = process.env.ADMIN_URL_TOKEN;
  const validPassphrase = process.env.ADMIN_PASSPHRASE;

  if (
    !validToken ||
    !validPassphrase ||
    token !== validToken ||
    passphrase !== validPassphrase
  ) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const cookieValue = createHash("sha256")
    .update(validPassphrase + validToken)
    .digest("hex");

  const cookieStore = await cookies();
  cookieStore.set("admin_auth", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
