import { redirect } from "next/navigation";
import { getToken, api } from "@/lib/api";

type Params = Promise<{ code: string }>;

export default async function InvitePage({ params }: { params: Params }) {
  const { code } = await params;
  const token = getToken();

  if (!token) {
    redirect(`/login?next=/app/invite/${code}`);
  }

  try {
    const result = await api.invites.accept(code);
    redirect(`/app/journals/${result.journalId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    redirect(`/app?invite=error&reason=${encodeURIComponent(message)}`);
  }
}
