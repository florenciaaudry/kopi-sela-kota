import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import {
  hasPartialSupabaseConfig,
  hasSupabaseConfig,
  isDemoMode,
} from "@/lib/runtime-mode";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isDemoMode()) {
    return NextResponse.next();
  }

  if (hasPartialSupabaseConfig()) {
    if (request.nextUrl.pathname === "/login") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login?configuration=invalid", request.url));
  }

  if (!hasSupabaseConfig() || !supabaseUrl || !supabaseAnonKey) {
    if (request.nextUrl.pathname === "/login") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (error && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("session", "expired");
    return NextResponse.redirect(loginUrl);
  }

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
