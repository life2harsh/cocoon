import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { api } from "@/lib/api";
import AppClient from "./AppClient";

export default async function AppHome() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const journals = await api.journals.list(token);
    
    return (
      <main className="mx-auto max-w-4xl px-6 py-12 warm-enter">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-ink-soft">Your space</p>
          <h1 className="mt-2 text-2xl font-light text-foreground">Notebooks</h1>
          <p className="mt-2 text-sm text-ink-muted">A calm place for daily reflections.</p>
        </div>
        <AppClient journals={journals.filter((j: any) => !j.archived_at)} archivedJournals={journals.filter((j: any) => j.archived_at)} />
      </main>
    );
  } catch (error) {
    redirect("/login");
  }
}
