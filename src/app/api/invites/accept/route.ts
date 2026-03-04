import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "missing_session" }, { status: 401 });
    }
    const body = (await request.json()) as { code?: string };
    if (!body.code) {
      return NextResponse.json({ message: "invalid_payload" }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("accept_invite", {
      invite_code: body.code,
    });
    if (error || !data) {
      return NextResponse.json({ message: error?.message ?? "invalid" }, { status: 400 });
    }
    return NextResponse.json({ journalId: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid";
    return NextResponse.json({ message }, { status: 500 });
  }
}
