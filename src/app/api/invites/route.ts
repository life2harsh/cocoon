import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ message: "missing_session" }, { status: 401 });
    }
    const body = (await request.json()) as { journalId?: string; code?: string };
    if (!body.journalId || !body.code) {
      return Response.json({ message: "invalid_payload" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("journal_invites")
      .insert({ journal_id: body.journalId, code: body.code, created_by: user.id })
      .select("code")
      .single();
    if (error || !data) {
      return Response.json({ message: error?.message ?? "create_failed" }, { status: 500 });
    }
    return Response.json({ code: data.code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return Response.json({ message }, { status: 500 });
  }
}
