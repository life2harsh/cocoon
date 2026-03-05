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

    const { data: entries, error } = await supabase
      .from("entries")
      .select("id, body, encrypted_body, nonce, created_at, author_id")
      .eq("prompt_id", promptId)
      .order("created_at", { ascending: true });

    if (error || !entries?.length) {
      return Response.json({ replies: [] });
    }

    const authorIds = [...new Set(entries.map((e) => e.author_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, display_name")
      .in("id", authorIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const replies = entries.map((entry) => ({
      id: entry.id,
      body: entry.body,
      encrypted_body: entry.encrypted_body,
      nonce: entry.nonce,
      created_at: entry.created_at,
      author_id: entry.author_id,
      author: entry.author_id === user.id
        ? "You"
        : profileMap.get(entry.author_id)?.display_name || "Partner",
      is_self: entry.author_id === user.id,
    }));

    return Response.json({ replies });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
