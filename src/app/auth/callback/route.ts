import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/app";
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const env = getEnv();
  if (!env) {
    return NextResponse.redirect(
      new URL("/login?error=missing_env", request.url)
    );
  }

  // Build the redirect response up-front so we can attach cookies to it.
  const redirectUrl = new URL(next, request.url);
  let response = NextResponse.redirect(redirectUrl);

  // Create a Supabase client that reads cookies from the incoming request
  // and writes cookies onto both the request (for downstream use) and the
  // outgoing redirect response (so the browser stores the session).
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          // Re-create the redirect so it carries the updated cookies.
          response = NextResponse.redirect(redirectUrl);
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return response;
}
