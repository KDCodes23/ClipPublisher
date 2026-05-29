import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session so it doesn't expire mid-visit
  const { data: { user }, error } = await supabase.auth.getUser();

  // Stale/revoked refresh token — wipe the bad cookies so the loop stops.
  // API routes get a clean next() so their handlers can return 401 normally.
  // Page routes get redirected to login.
  if (error?.code === "refresh_token_not_found") {
    const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
    const response = isApiRoute
      ? NextResponse.next({ request })
      : NextResponse.redirect(new URL("/login", request.url));
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) response.cookies.delete(name);
    });
    return response;
  }

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/editor");
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
