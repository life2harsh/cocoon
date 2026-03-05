import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import JournalClient from "./JournalClient";

type Params = Promise<{ id: string }>;

export default async function JournalPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("journal_members")
    .select("role")
    .eq("journal_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/app");
  }

  const { data: journal, error: journalError } = await supabase
    .from("journals")
    .select("id, name, description, owner_id, archived_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (journalError || !journal) {
    redirect("/app");
  }

  const { data: members } = await supabase
    .from("journal_members")
    .select("user_id, role")
    .eq("journal_id", id);

  const userIds = members?.map((m) => m.user_id).filter(Boolean) || [];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
  const membersWithNames = members?.map((m) => ({
    ...m,
    display_name: profileMap.get(m.user_id)?.display_name || null,
  })) || [];

  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("id, body, encrypted_body, nonce, created_at, edited_at, author_id, prompt_id")
    .eq("journal_id", id)
    .order("created_at", { ascending: false });

  const visibleEntries = (entries ?? []).filter((entry) => !entry.prompt_id);
  const authorIds = [
    ...new Set(visibleEntries.map((e) => e.author_id).filter(Boolean) || []),
  ];
  const { data: authorProfiles } = await supabase
    .from("user_profiles")
    .select("id, display_name, username")
    .in("id", authorIds);

  const authorProfileMap = new Map(authorProfiles?.map((p) => [p.id, p]) || []);

  const entriesWithAuthors =
    visibleEntries.map((entry) => ({
      ...entry,
      author: entry.author_id === user.id
        ? { id: user.id, display_name: "You", username: null, is_self: true }
        : authorProfileMap.get(entry.author_id)
          ? { id: entry.author_id, display_name: authorProfileMap.get(entry.author_id)?.display_name || "Unknown", username: authorProfileMap.get(entry.author_id)?.username, is_self: false }
          : { id: entry.author_id, display_name: "Unknown", username: null, is_self: false },
    }));

  return (
    <JournalClient
      journal={{ ...journal, role: membership.role }}
      entries={entriesWithAuthors}
      members={membersWithNames}
      userId={user.id}
    />
  );
}
