import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/app";
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  
  try {
    const response = await fetch(`${apiUrl}/auth/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      credentials: "include",
    });

    if (!response.ok) {
      let errorText = "auth_failed";
      try {
        const error = await response.json();
        errorText = error.detail || JSON.stringify(error);
      } catch {}
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorText)}`, request.url));
    }

    const redirectUrl = new URL(next, request.url);
    
    const setCookie = response.headers.get("set-cookie");
    const response2 = NextResponse.redirect(redirectUrl);
    
    if (setCookie) {
      response2.headers.set("set-cookie", setCookie);
    }
    
    return response2;
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }
}
