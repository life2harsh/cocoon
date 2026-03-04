"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DailyPromptCard } from "@/components/DailyPromptCard";

type Journal = {
  id: string;
  name: string;
  owner_id: string;
  archived_at: string | null;
};

type Entry = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author_id: string;
};

type JournalClientProps = {
  journal: Journal;
  entries: Entry[];
  userId: string;
};

export default function JournalClient({ journal, entries, userId }: JournalClientProps) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const canEdit = useMemo(() => (entry: Entry) => entry.author_id === userId, [userId]);

  async function handleSaveEntry() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      await fetch(`/api/journals/${journal.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      setDraft("");
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateEntry(entryId: string) {
    if (!editingBody.trim()) return;
    await fetch(`/api/journals/${journal.id}/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editingBody.trim() }),
    });
    setEditingId(null);
    setEditingBody("");
    window.location.reload();
  }

  async function handleShare() {
    const code = generateInviteCode();
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journalId: journal.id, code }),
    });
    const payload = (await res.json()) as { code?: string };
    if (!res.ok || !payload.code) return;
    const url = `${window.location.origin}/app/invite/${payload.code}`;
    await navigator.clipboard?.writeText(url).catch(() => {});
    alert(`Invite link copied:\n${url}\n\nInvite code: ${payload.code}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 animate-rise motion-reduce:animate-none">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <Link href="/app" className="text-xs uppercase tracking-[0.2em] text-ink-soft">
            Back to notebooks
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground font-[family:var(--font-display)]">
            {journal.name}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-ink-muted">
            Let the day settle. Write what you need to hold.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-11 items-center justify-center rounded-full bg-card px-4 text-sm font-semibold text-foreground ring-1 ring-stroke transition hover:-translate-y-0.5 hover:bg-card-strong"
          >
            Share
          </button>
        </div>
      </div>

      <div className="mt-8">
        <DailyPromptCard journalId={journal.id} />
      </div>

      <section className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">New entry</p>
        <textarea
          placeholder="Start where you are. You can always edit later."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="mt-4 h-44 w-full resize-none rounded-2xl bg-input p-4 text-base leading-7 text-foreground placeholder:text-ink-soft ring-1 ring-input-border focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-ink-soft">Entries can be edited, not deleted.</p>
          <button
            type="button"
            onClick={handleSaveEntry}
            className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-accent-strong"
          >
            {saving ? "Saving..." : "Save entry"}
          </button>
        </div>
      </section>

      <section className="mt-10 grid gap-4">
        {entries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stroke bg-card/50 p-10 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-ink-soft">
              No entries yet
            </p>
            <p className="mt-3 text-sm text-ink-muted">
              Begin with a few lines. You can return and edit anytime.
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
                {new Date(entry.created_at).toLocaleDateString()}
              </p>
              {editingId === entry.id ? (
                <textarea
                  value={editingBody}
                  onChange={(event) => setEditingBody(event.target.value)}
                  className="mt-3 h-32 w-full resize-none rounded-2xl bg-input p-4 text-base leading-7 text-foreground ring-1 ring-input-border focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-foreground">
                  {entry.body}
                </p>
              )}
              {entry.edited_at ? (
                <p className="mt-4 text-xs text-ink-soft">Edited</p>
              ) : null}
              {canEdit(entry) ? (
                <div className="mt-4 flex items-center gap-2">
                  {editingId === entry.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateEntry(entry.id)}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-accent-strong"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingBody("");
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-card px-4 text-xs font-semibold text-foreground ring-1 ring-stroke transition hover:-translate-y-0.5 hover:bg-card-strong"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditingBody(entry.body);
                      }}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-card px-4 text-xs font-semibold text-foreground ring-1 ring-stroke transition hover:-translate-y-0.5 hover:bg-card-strong"
                    >
                      Edit
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function generateInviteCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += letters[Math.floor(Math.random() * letters.length)];
  }
  return out;
}
