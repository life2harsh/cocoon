import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/app/invite/${code}`);

  const { data: invite, error: inviteError } = await supabase
    .from("journal_invites")
    .select("id, journal_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (inviteError) redirect(`/app?invite=error&reason=${encodeURIComponent(inviteError.message)}`);
  if (!invite) redirect("/app?invite=not_found");
  if (invite.used_at) redirect("/app?invite=used");
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    redirect("/app?invite=expired");

  const { data: existing } = await supabase
    .from("journal_members")
    .select("journal_id")
    .eq("journal_id", invite.journal_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberError } = await supabase
      .from("journal_members")
      .insert({
        journal_id: invite.journal_id,
        user_id: user.id,
        role: "member",
      });

    if (memberError) redirect(`/app?invite=join_failed&reason=${encodeURIComponent(memberError.message)}`);

    await supabase
      .from("journal_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);
  }

  redirect(`/app/journals/${invite.journal_id}`);
}
