import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { api } from "@/lib/api";
import JournalClient from "./JournalClient";

type Params = Promise<{ id: string }>;

export default async function JournalPage({ params }: { params: Params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const { journal, members, entries } = await api.journals.get(id, token);

    return (
      <JournalClient
        journal={journal}
        entries={entries.map((e: any) => ({
          ...e,
          author: { id: e.author_id, display_name: e.author_id === token ? "You" : "Unknown", is_self: e.author_id === token }
        }))}
        members={members}
        userId={token}
      />
    );
  } catch (error) {
    redirect("/app");
  }
}
