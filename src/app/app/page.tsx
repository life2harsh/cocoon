import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppClient from "./AppClient";

export default async function AppHome() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: allJournals } = await supabase
    .from("journals")
    .select("id, name, owner_id, archived_at, created_at")
    .order("created_at", { ascending: false });

  const journals = (allJournals ?? []).filter((j) => !j.archived_at);
  const archivedJournals = (allJournals ?? []).filter((j) => j.archived_at);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 animate-rise motion-reduce:animate-none">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
            Your space
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground font-[family:var(--font-display)]">
            Notebooks
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-ink-muted">
            A calm place for daily reflections and shared moments.
          </p>
        </div>
      </div>

      <AppClient
        journals={journals}
        archivedJournals={archivedJournals}
        hasJournals={(allJournals ?? []).length > 0}
        userId={user.id}
      />
    </main>
  );
}
