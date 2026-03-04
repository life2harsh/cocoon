import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPromptForToday } from "@/lib/prompts";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const journalId = searchParams.get("journal_id");

    if (!journalId) {
      return Response.json({ error: "journal_id required" }, { status: 400 });
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("ai_enabled")
      .eq("user_id", user.id)
      .single();

    if (settings && !settings.ai_enabled) {
      return Response.json({ question: null, enabled: false });
    }

    const { data: template } = await supabase
      .from("journal_templates")
      .select("template_type")
      .eq("journal_id", journalId)
      .single();

    const templateType = template?.template_type || "free_write";
    const question = getPromptForToday(templateType);

    return Response.json({ question, templateType });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
