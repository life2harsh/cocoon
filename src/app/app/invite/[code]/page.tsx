import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  let journalId: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=/app/invite/${code}`);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/invites/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
    const payload = (await res.json()) as { journalId?: string; message?: string };
    if (!res.ok || !payload.journalId) {
      const message = payload.message ?? "";
      if (message.includes("invite_expired")) redirect("/app?invite=expired");
      if (message.includes("invite_used")) redirect("/app?invite=used");
      redirect("/app?invite=invalid");
    }
    journalId = payload.journalId;
  } catch {
    redirect("/app?invite=invalid");
  }

  if (journalId) redirect(`/app/journals/${journalId}`);
  redirect("/app?invite=invalid");
}
