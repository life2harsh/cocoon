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
    } = await supabase.auth.getUser();

    if (!user) {
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

    const { data: template, error } = await supabase
      .from("journal_templates")
      .select("ai_prompts_enabled")
      .eq("journal_id", id)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!template) {
      const { error: upsertError } = await supabase
        .from("journal_templates")
        .upsert({ journal_id: id, template_type: "free_write", ai_prompts_enabled: true });
      if (upsertError) {
        return Response.json({ error: upsertError.message }, { status: 500 });
      }
      return Response.json({ ai_prompts_enabled: true });
    }

    return Response.json({
      ai_prompts_enabled: template?.ai_prompts_enabled ?? true,
    });
  } catch (error) {
    return Response.json(
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

    const body = (await request.json()) as { ai_prompts_enabled?: boolean };

    if (typeof body.ai_prompts_enabled !== "boolean") {
      return Response.json({ error: "invalid_payload" }, { status: 400 });
    }

    const { error } = await supabase
      .from("journal_templates")
      .update({ ai_prompts_enabled: body.ai_prompts_enabled })
      .eq("journal_id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
