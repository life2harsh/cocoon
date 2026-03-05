import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get("prompt_id");

    if (!promptId) {
      return Response.json({ error: "prompt_id required" }, { status: 400 });
    }

    const { data: entry, error } = await supabase
      .from("entries")
      .select("id, body, encrypted_body, nonce, created_at, author_id")
      .eq("prompt_id", promptId)
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !entry) {
      return Response.json({});
    }

    return Response.json({
      id: entry.id,
      body: entry.body,
      encrypted_body: entry.encrypted_body,
      nonce: entry.nonce,
      created_at: entry.created_at,
      author: "You",
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
