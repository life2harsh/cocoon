"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { DailyPromptCard } from "@/components/DailyPromptCard";

type JournalPageProps = {
  params: Promise<{ id: string }>;
};

type Entry = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author_id: string;
};

export default function JournalPage({ params }: JournalPageProps) {
  const { id } = use(params);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [journalName, setJournalName] = useState("Loading...");

  useEffect(() => {
    Promise.all([
      fetch(`/api/journals/${id}/entries`).then(res => res.json()),
      fetch(`/api/journals/${id}`).then(res => res.json())
    ]).then(([entriesData, journalData]) => {
      if (Array.isArray(entriesData)) setEntries(entriesData);
      if (journalData?.name) setJournalName(journalData.name);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSaveEntry() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    const res = await fetch(`/api/journals/${id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    if (res.ok) {
      setDraft("");
      const data = await res.json();
      if (data.id) {
        setEntries(prev => [{ id: data.id, body: draft, created_at: new Date().toISOString(), edited_at: null, author_id: "me" }, ...prev]);
      }
    }
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 animate-rise motion-reduce:animate-none">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <Link href="/app" className="text-xs uppercase tracking-[0.2em] text-ink-soft">
            Back to notebooks
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground font-[family:var(--font-display)]">
            {journalName}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-ink-muted">
            Let the day settle. Write what you need to hold.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <DailyPromptCard journalId={id} />
      </div>

      <section className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">New entry</p>
        <textarea
          placeholder="Start where you are. You can always edit later."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-4 h-44 w-full resize-none rounded-2xl bg-input p-4 text-base leading-7 text-foreground placeholder:text-ink-soft ring-1 ring-input-border focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={handleSaveEntry}
            disabled={saving || !draft.trim()}
            className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save entry"}
          </button>
        </div>
      </section>

      <section className="mt-10 grid gap-4">
        {loading ? (
          <div className="text-center text-ink-soft">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stroke bg-card/50 p-10 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-ink-soft">No entries yet</p>
            <p className="mt-3 text-sm text-ink-muted">Begin with a few lines.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
                {new Date(entry.created_at).toLocaleDateString()}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-foreground">{entry.body}</p>
              {entry.edited_at && <p className="mt-4 text-xs text-ink-soft">Edited</p>}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
