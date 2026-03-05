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

    const { data: membership } = await supabase
      .from("journal_members")
      .select("user_id")
      .eq("journal_id", journalId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return Response.json({ error: "access_denied" }, { status: 403 });
    }

    const { data: template } = await supabase
      .from("journal_templates")
      .select("template_type, ai_prompts_enabled")
      .eq("journal_id", journalId)
      .maybeSingle();

    if (!template) {
      const { error: upsertError } = await supabase
        .from("journal_templates")
        .upsert({ journal_id: journalId, template_type: "free_write", ai_prompts_enabled: true });
      if (upsertError) {
        return Response.json({ error: upsertError.message }, { status: 500 });
      }
    }

    const aiEnabled = (template?.ai_prompts_enabled ?? true) !== false;
    const today = new Date().toISOString().split("T")[0];

    async function fetchExisting() {
      const { data } = await supabase
        .from("daily_questions")
        .select("id, question_text")
        .eq("journal_id", journalId)
        .eq("question_date", today)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    }

    if (!aiEnabled) {
      const existing = await fetchExisting();

      if (existing?.id) {
        return Response.json({
          id: existing.id,
          question: existing.question_text,
          templateType: template?.template_type || "free_write",
          enabled: false,
        });
      }

      return Response.json({ question: null, enabled: false });
    }

    const templateType = template?.template_type || "free_write";
    const existing = await fetchExisting();

    if (existing?.id) {
      return Response.json({
        id: existing.id,
        question: existing.question_text,
        templateType,
        enabled: true,
      });
    }

    const { data: randomPrompt } = await supabase
      .rpc("get_random_prompt", { p_template: templateType });

    const question = randomPrompt?.[0]?.question_text || getPromptForToday(templateType);

    const insertPayload = {
      journal_id: journalId,
      question_text: question,
      question_date: today,
      template_type: templateType,
      user_id: user.id,
    } as Record<string, unknown>;

    const attemptInsert = async (payload: Record<string, unknown>) => {
      return supabase
        .from("daily_questions")
        .insert(payload)
        .select("id, question_text")
        .maybeSingle();
    };

    let { data: inserted, error: insertError } = await attemptInsert(insertPayload);
    const insertErrorMessage = insertError?.message || "";

    if (insertErrorMessage.includes("user_id") && insertErrorMessage.includes("does not exist")) {
      const { user_id: _userId, ...fallbackPayload } = insertPayload;
      const retry = await attemptInsert(fallbackPayload);
      inserted = retry.data;
      insertError = retry.error;
    }

    if (insertErrorMessage.includes("user_id") && insertErrorMessage.includes("null value")) {
      const { user_id: _userId, ...fallbackPayload } = insertPayload;
      const retry = await attemptInsert(fallbackPayload);
      inserted = retry.data;
      insertError = retry.error;
    }

    const finalRow = inserted?.id ? inserted : await fetchExisting();

    if (!finalRow?.id) {
      if (insertError?.message?.includes("duplicate key")) {
        const retryExisting = await fetchExisting();
        if (retryExisting?.id) {
          return Response.json({
            id: retryExisting.id,
            question: retryExisting.question_text,
            templateType,
            enabled: true,
          });
        }
      }
      return Response.json(
        { error: insertError?.message || "daily_question_unavailable" },
        { status: 500 }
      );
    }

    return Response.json({
      id: finalRow.id,
      question: finalRow.question_text,
      templateType,
      enabled: true,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
