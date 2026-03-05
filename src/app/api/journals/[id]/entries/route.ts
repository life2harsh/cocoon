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
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("journal_members")
      .select("user_id")
      .eq("journal_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "access_denied" }, { status: 403 });
    }

    const { data: entries, error } = await supabase
      .from("entries")
      .select("id, body, encrypted_body, nonce, created_at, edited_at, author_id, prompt_id")
      .eq("journal_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const authorIds = [...new Set(entries?.map((e) => e.author_id).filter(Boolean) || [])];
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, display_name, username")
      .in("id", authorIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const entriesWithAuthors = entries?.map((entry) => ({
      ...entry,
      author: entry.author_id === user.id
        ? { id: user.id, display_name: "You", is_self: true }
        : profileMap.get(entry.author_id)
          ? { ...profileMap.get(entry.author_id), is_self: false }
          : { id: entry.author_id, display_name: "Unknown", is_self: false },
    })) || [];

    return NextResponse.json(entriesWithAuthors);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
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
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "missing_session" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("journal_members")
      .select("user_id")
      .eq("journal_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "access_denied" }, { status: 403 });
    }

    const body = (await request.json()) as { body?: string; prompt_id?: string; encrypted_body?: string; nonce?: string };
    const trimmedBody = body.body?.trim() || "";
    if (!trimmedBody && !body.encrypted_body) {
      return NextResponse.json({ message: "invalid_payload" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("entries")
      .insert({
        journal_id: id,
        author_id: user.id,
        body: trimmedBody,
        encrypted_body: body.encrypted_body || null,
        nonce: body.nonce || null,
        prompt_id: body.prompt_id || null,
      })
      .select("id, created_at")
      .single();
    if (error || !data) {
      return NextResponse.json({ message: error?.message ?? "create_failed" }, { status: 500 });
    }

    await supabase.from("journal_streaks").upsert(
      {
        user_id: user.id,
        journal_id: id,
        last_entry_date: new Date().toISOString().split("T")[0],
      },
      { onConflict: "user_id,journal_id" }
    );

    const { data: existing } = await supabase
      .from("journal_streaks")
      .select("current_streak, longest_streak, last_entry_date, total_entries")
      .eq("user_id", user.id)
      .eq("journal_id", id)
      .single();

    const today = new Date().toISOString().split("T")[0];
    let newStreak = 1;
    let newLongest = existing?.longest_streak || 0;
    let newTotal = (existing?.total_entries || 0) + 1;

    if (existing?.last_entry_date) {
      const lastDate = new Date(existing.last_entry_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        newStreak = existing.current_streak;
      } else if (diffDays === 1) {
        newStreak = existing.current_streak + 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }

    if (newStreak > newLongest) {
      newLongest = newStreak;
    }

    await supabase
      .from("journal_streaks")
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_entry_date: today,
        total_entries: newTotal,
      })
      .eq("user_id", user.id)
      .eq("journal_id", id);

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
