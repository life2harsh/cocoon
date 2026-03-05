import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("journal_members")
      .select("role")
      .eq("journal_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "access_denied" }, { status: 403 });
    }

    const { data: journal, error } = await supabase
      .from("journals")
      .select("id, name, description, owner_id, archived_at, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!journal) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ...journal, role: membership.role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "missing_session" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("journal_members")
      .select("role")
      .eq("journal_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "access_denied" }, { status: 403 });
    }

    const body = (await request.json()) as { name?: string; archived?: boolean; description?: string | null };
    const update: { name?: string; archived_at?: string | null; description?: string | null } = {};
    if (typeof body.name === "string" && body.name.trim()) {
      update.name = body.name.trim();
    }
    if ("description" in body) {
      update.description = body.description?.trim() || null;
    }
    if (typeof body.archived === "boolean") {
      update.archived_at = body.archived ? new Date().toISOString() : null;
    }

    const { error } = await supabase
      .from("journals")
      .update(update)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "missing_session" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("journal_members")
      .select("role")
      .eq("journal_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "only_owner_can_delete" }, { status: 403 });
    }

    const { error } = await supabase
      .from("journals")
      .delete()
      .eq("id", id);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
