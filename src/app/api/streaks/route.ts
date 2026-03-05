import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { data: streak, error } = await supabase
      .from("journal_streaks")
      .select("current_streak, longest_streak, last_entry_date, total_entries")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const { data: entries } = await supabase
      .from("entries")
      .select("created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(90);

    const entryDates = [...new Set(
      entries?.map((e) => new Date(e.created_at).toISOString().split("T")[0]) || []
    )].sort().reverse();

    return Response.json({
      ...(streak || {
        current_streak: 0,
        longest_streak: 0,
        last_entry_date: null,
        total_entries: 0,
      }),
      entry_dates: entryDates,
    });
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

    const { journal_id } = (await request.json()) as { journal_id?: string };
    const today = new Date().toISOString().split("T")[0] as string;

    const { data: existing, error: fetchError } = await supabase
      .from("journal_streaks")
      .select("current_streak, longest_streak, last_entry_date, total_entries")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    let newStreak = 1;
    let newLongest = existing?.longest_streak || 0;
    const newTotal = (existing?.total_entries || 0) + 1;

    if (existing?.last_entry_date) {
      const lastDate = new Date(existing.last_entry_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        newStreak = existing.current_streak;
      } else if (diffDays === 1) {
        newStreak = existing.current_streak + 1;
      }
    }

    if (newStreak > newLongest) {
      newLongest = newStreak;
    }

    const { error: upsertError } = await supabase.from("journal_streaks").upsert(
      {
        user_id: user.id,
        journal_id: journal_id || null,
        current_streak: newStreak,
        longest_streak: newLongest,
        last_entry_date: today,
        total_entries: newTotal,
      },
      { onConflict: "user_id,journal_id" }
    );

    if (upsertError) {
      return Response.json({ error: upsertError.message }, { status: 500 });
    }

    return Response.json({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_entry_date: today,
      total_entries: newTotal,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
