import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = {
  params: Promise<{ id: string; entryId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id, entryId } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "missing_session" }, { status: 401 });
    }
    const body = (await request.json()) as { body?: string };
    if (!body.body || !body.body.trim()) {
      return NextResponse.json({ message: "invalid_payload" }, { status: 400 });
    }
    const { error } = await supabase
      .from("entries")
      .update({ body: body.body.trim(), edited_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("journal_id", id)
      .eq("author_id", user.id);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
