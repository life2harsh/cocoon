import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, username, display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data || { id: user.id, username: null, display_name: null });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as { display_name?: string; username?: string; public_key?: string };

    const { error } = await supabase
      .from("user_profiles")
      .upsert({
        id: user.id,
        display_name: body.display_name?.trim() || null,
        username: body.username?.trim() || null,
        public_key: body.public_key || undefined,
      }, { onConflict: "id" });

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
