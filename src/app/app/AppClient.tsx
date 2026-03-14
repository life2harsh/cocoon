"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { api, clearToken } from "@/lib/api";
import { JournalTemplatePicker } from "@/components/JournalTemplatePicker";
import { StreakBadge } from "@/components/StreakBadge";

type JournalSummary = {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  archived_at: string | null;
  created_at: string;
};

type AppClientProps = {
  journals: JournalSummary[];
  archivedJournals: JournalSummary[];
};

export default function AppClient({ journals, archivedJournals }: AppClientProps) {
  const [creating, setCreating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinStatus, setJoinStatus] = useState<"idle" | "pending" | "error" | "success">("idle");
  const [createStatus, setCreateStatus] = useState<"idle" | "pending" | "error">("idle");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasList = journals.length > 0;

  async function refresh() {
    setRefreshKey(k => k + 1);
  }

  async function handleCreateWithTemplate(templateType: string) {
    setShowTemplatePicker(false);
    setCreating(true);
    setCreateStatus("pending");
    try {
      const journal = await api.journals.create({ template_type: templateType });
      window.location.assign(`/app/journals/${journal.id}`);
    } catch (err) {
      setCreateStatus("error");
      setCreateMessage(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinNotebook() {
    if (!inviteCode.trim()) return;
    setJoinStatus("pending");
    try {
      const result = await api.invites.accept(inviteCode.trim());
      setJoinStatus("success");
      window.location.assign(`/app/journals/${result.journalId}`);
    } catch (err) {
      setJoinStatus("error");
    }
  }

  async function handleCreateInvite(journalId: string) {
    setShareStatus("loading");
    setShowShareModal(true);
    setShareUrl(null);
    setShareCode(null);
    try {
      const result = await api.invites.create(journalId);
      const url = `${window.location.origin}/app/invite/${result.code}`;
      setShareUrl(url);
      setShareCode(result.code);
      setShareStatus("ready");
    } catch {
      setShareStatus("error");
    }
  }

  async function handleRenameNotebook(journalId: string) {
    if (!renameValue.trim()) return;
    await api.journals.update(journalId, { name: renameValue.trim() });
    setRenamingId(null);
    setRenameValue("");
    refresh();
  }

  async function handleArchiveNotebook(journalId: string) {
    await api.journals.update(journalId, { archived: true });
    refresh();
  }

  async function handleRestoreNotebook(journalId: string) {
    await api.journals.update(journalId, { archived: false });
    refresh();
  }

  async function handleDeleteNotebook(journalId: string) {
    if (confirmingDelete) return;
    setConfirmingDelete(true);
    await api.journals.delete(journalId);
    setConfirmingDelete(false);
    setConfirmDeleteId(null);
    refresh();
  }

  return (
    <div key={refreshKey}>
      {showTemplatePicker && (
        <JournalTemplatePicker onSelect={handleCreateWithTemplate} onClose={() => setShowTemplatePicker(false)} />
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
                    <input readOnly value={shareUrl} className="flex-1 h-10 rounded-xl bg-input px-3 text-sm text-foreground" />
                    <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="px-3 h-10 rounded-xl bg-card text-xs font-medium">Copy</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-ink-soft">Code</label>
                  <div className="mt-1 flex gap-2">
                    <input readOnly value={shareCode || ""} className="flex-1 h-10 rounded-xl bg-input px-3 text-sm text-foreground" />
                    <button onClick={() => navigator.clipboard?.writeText(shareCode || "")} className="px-3 h-10 rounded-xl bg-card text-xs font-medium">Copy</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative w-full max-w-sm warm-card p-6 animate-rise">
            <h2 className="text-lg font-light text-foreground mb-3">Delete notebook?</h2>
            <p className="text-sm text-ink-muted mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 h-9 rounded-xl bg-card text-xs font-medium">Cancel</button>
              <button onClick={() => handleDeleteNotebook(confirmDeleteId)} disabled={confirmingDelete} className="px-4 h-9 rounded-xl bg-accent text-white text-xs font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <StreakBadge />
        <div className="flex gap-2">
          <Link href="/app/settings" className="p-2 rounded-full bg-card">
            <svg className="w-5 h-5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="warm-card p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">Create or join a notebook</p>
          <div className="flex gap-2">
            <button onClick={() => setShowTemplatePicker(true)} className="px-4 h-10 rounded-full bg-accent text-sm font-medium text-white">
              {createStatus === "pending" ? "Creating..." : "New"}
            </button>
            <div className="flex items-center gap-1 rounded-full bg-input px-2">
              <input
                value={inviteCode}
                onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setJoinStatus("idle"); }}
                placeholder="Code"
                className="w-24 bg-transparent text-sm h-8 focus:outline-none"
              />
              <button onClick={handleJoinNotebook} className="px-3 text-xs font-medium">
                {joinStatus === "pending" ? "..." : "Join"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!hasList ? (
        <div className="warm-card p-8 text-center border-dashed">
          <p className="text-sm text-ink-muted mb-4">No notebooks yet</p>
          <button onClick={() => setShowTemplatePicker(true)} className="px-5 h-10 rounded-full bg-accent text-sm font-medium text-white">
            Create your first
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {journals.map((journal) => (
            <article key={journal.id} className="warm-card p-5 cursor-pointer hover:scale-[1.01] transition-transform" onClick={() => window.location.assign(`/app/journals/${journal.id}`)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-ink-soft">Notebook</p>
                  <h3 className="mt-1 text-base font-medium text-foreground truncate">{journal.name}</h3>
                  <p className="mt-1 text-xs text-ink-muted truncate">{journal.description || "Tap to write"}</p>
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setOpenMenuId(openMenuId === journal.id ? null : journal.id)} className="p-1 rounded-full hover:bg-ink/10">
                    <svg className="w-5 h-5 text-ink-soft" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {openMenuId === journal.id && (
                    <div className="absolute right-0 mt-1 w-36 warm-card shadow-lg z-10">
                      <button onClick={() => { setOpenMenuId(null); window.location.assign(`/app/journals/${journal.id}`); }} className="w-full px-3 py-2 text-left text-xs hover:bg-ink/5">Open</button>
                      <button onClick={() => { setOpenMenuId(null); handleCreateInvite(journal.id); }} className="w-full px-3 py-2 text-left text-xs hover:bg-ink/5">Share</button>
                      <button onClick={() => { setOpenMenuId(null); setRenamingId(journal.id); setRenameValue(journal.name); }} className="w-full px-3 py-2 text-left text-xs hover:bg-ink/5">Rename</button>
                      <button onClick={() => { setOpenMenuId(null); handleArchiveNotebook(journal.id); }} className="w-full px-3 py-2 text-left text-xs hover:bg-ink/5">Archive</button>
                      <button onClick={() => { setOpenMenuId(null); setConfirmDeleteId(journal.id); }} className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-ink/5">Delete</button>
                    </div>
                  )}
                </div>
              </div>
              {renamingId === journal.id && (
                <div className="mt-3 flex gap-2">
                  <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="flex-1 h-9 rounded-lg bg-input px-3 text-sm" />
                  <button onClick={() => handleRenameNotebook(journal.id)} className="px-3 h-9 rounded-lg bg-accent text-xs text-white">Save</button>
                  <button onClick={() => setRenamingId(null)} className="px-3 h-9 rounded-lg bg-card text-xs">Cancel</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {archivedJournals.length > 0 && (
        <div className="mt-8">
          <p className="text-xs uppercase tracking-wider text-ink-soft mb-3">Archived</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {archivedJournals.map((journal) => (
              <article key={journal.id} className="warm-card p-5 opacity-60">
                <h3 className="text-base font-medium text-foreground">{journal.name}</h3>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => handleRestoreNotebook(journal.id)} className="px-3 h-8 rounded-lg bg-card text-xs">Restore</button>
                  <button onClick={() => setConfirmDeleteId(journal.id)} className="px-3 h-8 rounded-lg bg-card text-xs text-red-400">Delete</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {joinStatus === "error" && <p className="mt-3 text-xs text-red-400">Invalid code. Try again.</p>}
    </div>
  );
}
