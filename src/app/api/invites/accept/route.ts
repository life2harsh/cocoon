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

    const { data: invite, error: inviteError } = await supabase
      .from("journal_invites")
      .select("id, journal_id, expires_at, used_at")
      .eq("code", body.code)
      .maybeSingle();

    if (inviteError) {
      return NextResponse.json({ message: inviteError.message }, { status: 500 });
    }

    if (!invite) {
      return NextResponse.json({ message: "invite_not_found" }, { status: 400 });
    }

    if (invite.used_at) {
      return NextResponse.json({ message: "invite_used" }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ message: "invite_expired" }, { status: 400 });
    }

    const { data: existingMember } = await supabase
      .from("journal_members")
      .select("journal_id")
      .eq("journal_id", invite.journal_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ journalId: invite.journal_id });
    }

    const { error: memberError } = await supabase
      .from("journal_members")
      .insert({
        journal_id: invite.journal_id,
        user_id: user.id,
        role: "member",
      });

    if (memberError) {
      return NextResponse.json({ message: memberError.message }, { status: 500 });
    }

    await supabase
      .from("journal_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    return NextResponse.json({ journalId: invite.journal_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid";
    return NextResponse.json({ message }, { status: 500 });
  }
}
