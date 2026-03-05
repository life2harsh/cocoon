import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { data: journals, error } = await supabase
      .from("journals")
      .select("id, name, owner_id, archived_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(journals ?? []);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as { name?: string; template_type?: string };
    const validTemplates = ["free_write", "structured", "gratitude", "cbt", "reflection", "habit", "couple"];
    const templateType = validTemplates.includes(body.template_type ?? "")
      ? body.template_type!
      : "free_write";
    const defaultName = templateType === "couple" ? "Our Journal" : "Untitled notebook";
    const name = body.name?.trim() || defaultName;

    const { data: journal, error } = await supabase
      .from("journals")
      .insert({ name, owner_id: user.id })
      .select("id, name, owner_id, created_at")
      .single();

    if (error || !journal) {
      return Response.json({ error: error?.message ?? "insert_failed" }, { status: 500 });
    }

    const { error: memberError } = await supabase
      .from("journal_members")
      .upsert({
        journal_id: journal.id,
        user_id: user.id,
        role: "owner",
      }, { onConflict: "journal_id,user_id" });

    if (memberError) {
      return Response.json({ error: memberError.message }, { status: 500 });
    }

    const { error: templateError } = await supabase
      .from("journal_templates")
      .upsert({
        journal_id: journal.id,
        template_type: templateType,
        ai_prompts_enabled: true,
      });

    if (templateError) {
      return Response.json({ error: templateError.message }, { status: 500 });
    }

    return Response.json({ ...journal, template_type: templateType });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
