"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DailyPromptCard } from "@/components/DailyPromptCard";

type Journal = {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  role?: string;
};

type Entry = {
  id: string;
  journal_id: string;
  author_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
};

type Member = {
  user_id: string;
  role: string;
  display_name: string | null;
};

type JournalClientProps = {
  journal: Journal;
  entries: Entry[];
  members: Member[];
  userId: string;
};

export default function JournalClient({ journal, entries, members, userId }: JournalClientProps) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [renameValue, setRenameValue] = useState(journal.name);
  const [descValue, setDescValue] = useState(journal.description || "");
  const [savingSettings, setSavingSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    api.journals.settings.get(journal.id).then((data) => {
      setAiEnabled(data.ai_prompts_enabled);
    }).catch(() => {});
  }, [journal.id]);

  async function refresh() {
    setRefreshKey(k => k + 1);
    window.location.reload();
  }

  async function handleSaveEntry() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      await api.entries.create(journal.id, { body: draft.trim() });
      setDraft("");
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateEntry(entryId: string) {
    if (!editingBody.trim()) return;
    await api.entries.update(journal.id, entryId, { body: editingBody.trim() });
    setEditingId(null);
    setEditingBody("");
    refresh();
  }

  async function handleShare() {
    setShowMenu(false);
    setShareStatus("loading");
    setShowShareModal(true);
    try {
      const result = await api.invites.create(journal.id);
      const url = `${window.location.origin}/app/invite/${result.code}`;
      setShareUrl(url);
      setShareCode(result.code);
      setShareStatus("ready");
    } catch {
      setShareStatus("error");
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      if (renameValue.trim() !== journal.name || descValue.trim() !== (journal.description || "")) {
        await api.journals.update(journal.id, { name: renameValue.trim(), description: descValue.trim() || undefined });
      }
      await api.journals.settings.update(journal.id, { ai_prompts_enabled: aiEnabled });
    } finally {
      setSavingSettings(false);
      setShowSettings(false);
      refresh();
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction || confirming) return;
    setConfirming(true);
    if (confirmAction === "archive") {
      await api.journals.update(journal.id, { archived: true });
    } else {
      await api.journals.delete(journal.id);
    }
    window.location.href = "/app";
  }

  return (
    <div key={refreshKey}>
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-sm warm-card p-6 animate-rise">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-light text-foreground">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded-full hover:bg-ink/10">
                <svg className="w-5 h-5 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-ink-soft">Name</label>
                <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="mt-1 w-full h-10 rounded-xl bg-input px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-ink-soft">Description</label>
                <input type="text" value={descValue} onChange={(e) => setDescValue(e.target.value)} placeholder="Optional" className="mt-1 w-full h-10 rounded-xl bg-input px-3 text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Daily prompts</p>
                  <p className="text-xs text-ink-soft">Show a gentle prompt each day</p>
                </div>
                <button onClick={() => setAiEnabled(!aiEnabled)} className={`h-8 px-3 rounded-full text-xs font-medium ${aiEnabled ? "bg-accent text-white" : "bg-ink/20 text-ink-soft"}`}>
                  {aiEnabled ? "On" : "Off"}
                </button>
              </div>
              <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full h-10 rounded-xl bg-accent text-sm font-medium text-white">
                {savingSettings ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-sm warm-card p-6 animate-rise">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-light text-foreground">Share notebook</h2>
              <button onClick={() => setShowShareModal(false)} className="p-1 rounded-full hover:bg-ink/10">
                <svg className="w-5 h-5 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {shareStatus === "ready" && shareUrl && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-ink-soft">Link</label>
                  <div className="mt-1 flex gap-2">
                    <input readOnly value={shareUrl} className="flex-1 h-10 rounded-xl bg-input px-3 text-sm" />
                    <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="px-3 h-10 rounded-xl bg-card text-xs font-medium">Copy</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-ink-soft">Code</label>
                  <div className="mt-1 flex gap-2">
                    <input readOnly value={shareCode || ""} className="flex-1 h-10 rounded-xl bg-input px-3 text-sm" />
                    <button onClick={() => navigator.clipboard?.writeText(shareCode || "")} className="px-3 h-10 rounded-xl bg-card text-xs font-medium">Copy</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-sm warm-card p-6 animate-rise">
            <h2 className="text-lg font-light text-foreground mb-3">{confirmAction === "archive" ? "Archive notebook?" : "Delete notebook?"}</h2>
            <p className="text-sm text-ink-muted mb-4">{confirmAction === "archive" ? "You can restore it anytime." : "This cannot be undone."}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmAction(null)} className="px-4 h-9 rounded-xl bg-card text-xs font-medium">Cancel</button>
              <button onClick={handleConfirmAction} disabled={confirming} className="px-4 h-9 rounded-xl bg-accent text-white text-xs font-medium">
                {confirming ? "..." : confirmAction === "archive" ? "Archive" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-10 warm-enter">
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href="/app" className="text-xs uppercase tracking-wider text-ink-soft hover:text-foreground transition-colors">← Back</Link>
            <h1 className="mt-3 text-2xl font-light text-foreground">{journal.name}</h1>
            {(journal.description || members.length > 1) && (
              <p className="mt-1 text-sm text-ink-muted">
                {journal.description}
                {journal.description && members.length > 1 && " · "}
                {members.length > 1 && members.map((m, i) => (
                  <span key={m.user_id}>{i > 0 && ", "}{m.display_name || "Collaborator"}</span>
                ))}
              </p>
            )}
          </div>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full bg-card hover:bg-card-strong transition-colors">
              <svg className="w-5 h-5 text-ink-muted" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-36 warm-card shadow-lg z-10">
                <button onClick={() => { setShowSettings(true); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-xs hover:bg-ink/5">Settings</button>
                <button onClick={handleShare} className="w-full px-3 py-2 text-left text-xs hover:bg-ink/5">Share</button>
                {journal.role === "owner" && (
                  <button onClick={() => { setShowMenu(false); setConfirmAction("archive"); }} className="w-full px-3 py-2 text-left text-xs hover:bg-ink/5">Archive</button>
                )}
                {journal.role === "owner" && (
                  <button onClick={() => { setShowMenu(false); setConfirmAction("delete"); }} className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-ink/5">Delete</button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <DailyPromptCard journalId={journal.id} />
        </div>

        <section className="warm-card p-5 mb-6">
          <p className="text-xs uppercase tracking-wider text-ink-soft mb-3">New entry</p>
          <textarea
            placeholder="What's on your mind?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-32 resize-none rounded-xl bg-input p-4 text-sm leading-relaxed placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <div className="mt-3 flex justify-end">
            <button onClick={handleSaveEntry} disabled={saving || !draft.trim()} className="px-5 h-10 rounded-full bg-accent text-sm font-medium text-white disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {entries.length === 0 ? (
            <div className="warm-card p-8 text-center border-dashed">
              <p className="text-sm text-ink-muted">No entries yet. Start writing above.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <article key={entry.id} className="warm-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-ink-soft">
                    {new Date(entry.created_at).toLocaleDateString()} · {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-ink-soft">{entry.author_id === userId ? "You" : "Co"}</p>
                </div>
                {editingId === entry.id ? (
                  <div className="space-y-2">
                    <textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} className="w-full h-28 resize-none rounded-xl bg-input p-3 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateEntry(entry.id)} className="px-3 h-8 rounded-lg bg-accent text-xs text-white">Save</button>
                      <button onClick={() => { setEditingId(null); setEditingBody(""); }} className="px-3 h-8 rounded-lg bg-card text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.body}</p>
                    {entry.edited_at && <p className="mt-2 text-xs text-ink-soft">Edited</p>}
                    {entry.author_id === userId && (
                      <button onClick={() => { setEditingId(entry.id); setEditingBody(entry.body || ""); }} className="mt-2 text-xs text-ink-soft hover:text-foreground">Edit</button>
                    )}
                  </>
                )}
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
