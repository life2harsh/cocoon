"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DailyPromptCard } from "@/components/DailyPromptCard";
import { encryptEntry, decryptEntry } from "@/lib/e2e";

type Journal = {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  archived_at: string | null;
  role?: string;
};

type Member = {
  user_id: string;
  role: string;
  display_name?: string | null;
};

type Author = {
  id: string;
  display_name: string;
  username?: string | null;
  is_self: boolean;
};

type Entry = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author_id: string;
  author: {
    id: string;
    display_name: string;
    username?: string | null;
    is_self: boolean;
  };
};

type JournalClientProps = {
  journal: Journal;
  entries: Entry[];
  members: Member[];
  userId: string;
};

export default function JournalClient({ journal, entries, members, userId }: JournalClientProps) {
  const [draft, setDraft] = useState("");
  const [decryptedEntries, setDecryptedEntries] = useState<Entry[]>(entries);
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
    fetch(`/api/journals/${journal.id}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ai_prompts_enabled !== undefined) {
          setAiEnabled(data.ai_prompts_enabled);
        }
      });
  }, [journal.id]);

  const canEdit = useMemo(() => (entry: Entry) => entry.author.is_self, []);

  useEffect(() => {
    async function decryptAll() {
      const updated = await Promise.all(entries.map(async (entry) => {
        if ((entry as any).encrypted_body && (entry as any).nonce) {
          const decrypted = await decryptEntry(journal.id, (entry as any).encrypted_body, (entry as any).nonce);
          if (decrypted) {
            return { ...entry, body: decrypted };
          }
        }
        return entry;
      }));
      setDecryptedEntries(updated);
    }
    decryptAll();
  }, [entries, journal.id]);

  async function handleSaveEntry() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      const encrypted = await encryptEntry(journal.id, draft.trim());
      await fetch(`/api/journals/${journal.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: draft.trim(),
          encrypted_body: encrypted?.cipher || null,
          nonce: encrypted?.iv || null,
        }),
      });
      setDraft("");
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateEntry(entryId: string) {
    if (!editingBody.trim()) return;
    const encrypted = await encryptEntry(journal.id, editingBody.trim());
    await fetch(`/api/journals/${journal.id}/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: editingBody.trim(),
        encrypted_body: encrypted?.cipher || null,
        nonce: encrypted?.iv || null,
      }),
    });
    setEditingId(null);
    setEditingBody("");
    window.location.reload();
  }

  async function handleShare() {
    setShowMenu(false);
    setShareStatus("loading");
    setShowShareModal(true);
    setShareUrl(null);
    setShareCode(null);
    const code = generateInviteCode();
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journalId: journal.id, code }),
    });
    const payload = (await res.json()) as { code?: string };
    if (!res.ok || !payload.code) {
      setShareStatus("error");
      return;
    }
    const url = `${window.location.origin}/app/invite/${payload.code}`;
    setShareUrl(url);
    setShareCode(payload.code);
    setShareStatus("ready");
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    await Promise.all([
      (renameValue.trim() !== journal.name || descValue.trim() !== (journal.description || "")) && fetch(`/api/journals/${journal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: renameValue.trim(),
          description: descValue.trim() || null,
        }),
      }),
      fetch(`/api/journals/${journal.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_prompts_enabled: aiEnabled }),
      }),
    ]);
    setSavingSettings(false);
    setShowSettings(false);
    window.location.reload();
  }

  async function handleArchive() {
    await fetch(`/api/journals/${journal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    window.location.href = "/app";
  }

  async function handleDeleteNotebook() {
    await fetch(`/api/journals/${journal.id}`, { method: "DELETE" });
    window.location.href = "/app";
  }

  async function handleConfirmAction() {
    if (!confirmAction || confirming) return;
    setConfirming(true);
    if (confirmAction === "archive") {
      await handleArchive();
      return;
    }
    await handleDeleteNotebook();
  }

  return (
    <>
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md bg-card-strong rounded-3xl ring-1 ring-stroke shadow-2xl animate-rise overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground font-[family:var(--font-display)]">
                Notebook Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-2 -m-2 rounded-full hover:bg-ink/20 transition-colors">
                <svg className="w-5 h-5 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="mt-2 w-full h-11 rounded-full bg-input px-4 text-base text-foreground ring-1 ring-input-border focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <input
                  type="text"
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  placeholder="A short description (optional)"
                  className="mt-2 w-full h-11 rounded-full bg-input px-4 text-base text-foreground placeholder:text-ink-soft ring-1 ring-input-border focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Daily Prompts</p>
                  <p className="text-xs text-ink-soft mt-0.5">Show a gentle prompt each day</p>
                </div>
                <button
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`h-9 px-4 rounded-full text-xs font-semibold transition-colors ${
                    aiEnabled
                      ? "bg-accent text-white"
                      : "bg-ink/20 text-ink-soft ring-1 ring-stroke"
                  }`}
                >
                  {aiEnabled ? "On" : "Off"}
                </button>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full h-11 rounded-full bg-accent text-sm font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-accent-strong disabled:opacity-50"
              >
                {savingSettings ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-md bg-card-strong rounded-3xl ring-1 ring-stroke shadow-2xl animate-rise overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground font-[family:var(--font-display)]">
                Share notebook
              </h2>
              <button onClick={() => setShowShareModal(false)} className="p-2 -m-2 rounded-full hover:bg-ink/20 transition-colors">
                <svg className="w-5 h-5 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-4">
              {shareStatus === "loading" && (
                <p className="text-sm text-ink-soft">Creating a share link...</p>
              )}
              {shareStatus === "error" && (
                <p className="text-sm text-ink-soft">Could not create a share link. Try again.</p>
              )}
              {shareStatus === "ready" && shareUrl && shareCode && (
                <>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-ink-soft">Invite link</label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        readOnly
                        value={shareUrl}
                        className="w-full h-11 rounded-full bg-input px-4 text-sm text-foreground ring-1 ring-input-border"
                      />
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(shareUrl).catch(() => {})}
                        className="h-11 px-4 rounded-full bg-card text-xs font-semibold text-foreground ring-1 ring-stroke transition hover:bg-card-strong"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-ink-soft">Invite code</label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        readOnly
                        value={shareCode}
                        className="w-full h-11 rounded-full bg-input px-4 text-sm text-foreground ring-1 ring-input-border"
                      />
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(shareCode).catch(() => {})}
                        className="h-11 px-4 rounded-full bg-card text-xs font-semibold text-foreground ring-1 ring-stroke transition hover:bg-card-strong"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-md bg-card-strong rounded-3xl ring-1 ring-stroke shadow-2xl animate-rise overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground font-[family:var(--font-display)]">
                {confirmAction === "archive" ? "Archive notebook" : "Delete notebook"}
              </h2>
              <button onClick={() => setConfirmAction(null)} className="p-2 -m-2 rounded-full hover:bg-ink/20 transition-colors">
                <svg className="w-5 h-5 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <p className="text-sm text-ink-soft">
                {confirmAction === "archive"
                  ? "Archive this notebook? You can restore it anytime from the home screen."
                  : "Delete this notebook and all entries? This cannot be undone."}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="h-10 px-4 rounded-full bg-card text-xs font-semibold text-foreground ring-1 ring-stroke transition hover:bg-card-strong"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={confirming}
                  className="h-10 px-4 rounded-full bg-accent text-xs font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-accent-strong disabled:opacity-50"
                >
                  {confirming ? "Working..." : confirmAction === "archive" ? "Archive" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6 py-16 animate-rise motion-reduce:animate-none">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <Link href="/app" className="text-xs uppercase tracking-[0.2em] text-ink-soft">
              Back to notebooks
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground font-[family:var(--font-display)]">
              {journal.name}
            </h1>
            {(journal.description || members.length > 1) && (
              <p className="mt-2 text-sm text-ink-soft">
                {journal.description}
                {journal.description && members.length > 1 && " · "}
                {members.length > 1 && members.map((m, i) => (
                  <span key={m.user_id}>
                    {i > 0 && ", "}
                    {m.display_name || (m.user_id === userId ? "You" : "Collaborator")}
                  </span>
                ))}
              </p>
            )}
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-card ring-1 ring-stroke transition hover:bg-card-strong"
            >
              <svg className="w-5 h-5 text-ink-muted" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-card-strong ring-1 ring-stroke shadow-xl overflow-hidden z-10">
                <button
                  onClick={() => { setShowSettings(true); setShowMenu(false); }}
                  className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-ink/10 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={handleShare}
                  className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-ink/10 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                {journal.role === "owner" && (
                  <button
                    onClick={() => { setShowMenu(false); setConfirmAction("archive"); }}
                    className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-ink/10 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Archive
                  </button>
                )}
                {journal.role === "owner" && (
                  <button
                    onClick={() => { setShowMenu(false); setConfirmAction("delete"); }}
                    className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-ink/10 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3h6m-7 4h8m-9 0h10l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            )}
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
        {decryptedEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stroke bg-card/50 p-10 text-center">
              <p className="text-sm uppercase tracking-[0.2em] text-ink-soft">
                No entries yet
              </p>
              <p className="mt-3 text-sm text-ink-muted">
                Begin with a few lines. You can return and edit anytime.
              </p>
            </div>
          ) : (
          decryptedEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
                    {new Date(entry.created_at).toLocaleDateString()} · {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {entry.author.is_self ? "You" : entry.author.display_name}
                  </p>
                </div>
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
    </>
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
