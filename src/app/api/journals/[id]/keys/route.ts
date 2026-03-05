import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("journal_members")
      .select("role")
      .eq("journal_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return Response.json({ error: "access_denied" }, { status: 403 });
    }

    const { data: keyRow } = await supabase
      .from("journal_keys")
      .select("encrypted_key")
      .eq("journal_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (keyRow?.encrypted_key) {
      return Response.json({ encrypted_key: keyRow.encrypted_key });
    }

    if (membership.role === "owner") {
      const { data: ownerProfile } = await supabase
        .from("user_profiles")
        .select("public_key")
        .eq("id", user.id)
        .maybeSingle();

      if (!ownerProfile?.public_key) {
        return Response.json({ need_public_key: true });
      }

      return Response.json({ generate: true, owner_public_key: ownerProfile.public_key });
    }

    return Response.json({ error: "missing_key" }, { status: 404 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("journal_members")
      .select("role")
      .eq("journal_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return Response.json({ error: "access_denied" }, { status: 403 });
    }

    const body = (await request.json()) as { encrypted_key?: string; target_user_id?: string };
    if (!body.encrypted_key) {
      return Response.json({ error: "missing_encrypted_key" }, { status: 400 });
    }

    const targetUserId = body.target_user_id || user.id;

    const { error } = await supabase
      .from("journal_keys")
      .upsert({
        journal_id: id,
        user_id: targetUserId,
        encrypted_key: body.encrypted_key,
      }, { onConflict: "journal_id,user_id" });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
