import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("entries")
      .select("id, body, created_at, edited_at, author_id")
      .eq("journal_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
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
    const body = (await request.json()) as { body?: string };
    if (!body.body || !body.body.trim()) {
      return NextResponse.json({ message: "invalid_payload" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("entries")
      .insert({ journal_id: id, author_id: user.id, body: body.body.trim() })
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
