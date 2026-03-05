"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { JournalTemplatePicker } from "@/components/JournalTemplatePicker";
import { StreakBadge } from "@/components/StreakBadge";

type JournalSummary = {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  archived_at: string | null;
  created_at: string;
  template_type?: string;
};

type AppClientProps = {
  journals: JournalSummary[];
  archivedJournals: JournalSummary[];
  hasJournals: boolean;
  userId: string | null;
};

export default function AppClient({ journals, archivedJournals, hasJournals, userId }: AppClientProps) {
  const [creating, setCreating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinStatus, setJoinStatus] = useState<"idle" | "pending" | "error" | "success">("idle");
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<"idle" | "pending" | "error">("idle");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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

  const joinLabel = useMemo(() => {
    if (joinStatus === "pending") return "Joining...";
    if (joinStatus === "success") return "Joined";
    return "Join notebook";
  }, [joinStatus]);

  async function handleCreateNotebook() {
    if (creating) return;
    setShowTemplatePicker(true);
  }

  async function handleCreateWithTemplate(templateType: string) {
    setShowTemplatePicker(false);
    setCreating(true);
    setCreateStatus("pending");
    try {
      const res = await fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_type: templateType }),
      });
      const payload = (await res.json()) as { id?: string; message?: string; details?: string | null; hint?: string | null; code?: string | null };
      if (!res.ok || !payload.id) {
        throw new Error(payload.message ?? payload.details ?? payload.hint ?? "create_failed");
      }
      window.location.assign(`/app/journals/${payload.id}`);
    } catch (err) {
      setCreateStatus("error");
      const message = err instanceof Error ? err.message : "";
      setCreateMessage(
        message.includes("missing_session")
          ? "Please sign in again to create a notebook."
          : message.includes("relation") && message.includes("journals")
            ? "Database tables are missing. Run supabase/schema.sql in Supabase."
            : "Something went wrong creating the notebook. Try again."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinNotebook() {
    if (!inviteCode.trim()) return;
    setJoinStatus("pending");
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      const payload = (await res.json()) as { journalId?: string; message?: string };
      if (!res.ok || !payload.journalId) {
        throw new Error(payload.message ?? "invalid");
      }
      setJoinStatus("success");
      setJoinMessage(null);
      window.location.assign(`/app/journals/${payload.journalId}`);
    } catch (err) {
      setJoinStatus("error");
      const message = err instanceof Error ? err.message : "";
      setJoinMessage(
        message.includes("invite_expired")
          ? "That invite has expired."
          : message.includes("invite_used")
            ? "That invite has already been used."
            : "That invite code did not work."
      );
    }
  }

  async function handleCreateInvite(journalId: string) {
    setShareStatus("loading");
    setShowShareModal(true);
    setShareUrl(null);
    setShareCode(null);
    const code = generateInviteCode();
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journalId, code }),
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

  async function handleRenameNotebook(journalId: string) {
    if (!renameValue.trim()) return;
    await fetch(`/api/journals/${journalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    setRenamingId(null);
    setRenameValue("");
    window.location.reload();
  }

  async function handleArchiveNotebook(journalId: string) {
    await fetch(`/api/journals/${journalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    window.location.reload();
  }

  async function handleRestoreNotebook(journalId: string) {
    await fetch(`/api/journals/${journalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    window.location.reload();
  }

  async function handleDeleteNotebook(journalId: string) {
    if (confirmingDelete) return;
    setConfirmingDelete(true);
    await fetch(`/api/journals/${journalId}`, { method: "DELETE" });
    setConfirmingDelete(false);
    setConfirmDeleteId(null);
    window.location.reload();
  }

  return (
    <div className="mt-10">
      {showTemplatePicker && (
        <JournalTemplatePicker
          onSelect={handleCreateWithTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
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
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative w-full max-w-md bg-card-strong rounded-3xl ring-1 ring-stroke shadow-2xl animate-rise overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground font-[family:var(--font-display)]">
                Delete notebook
              </h2>
              <button onClick={() => setConfirmDeleteId(null)} className="p-2 -m-2 rounded-full hover:bg-ink/20 transition-colors">
                <svg className="w-5 h-5 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <p className="text-sm text-ink-soft">Delete this notebook and all entries? This cannot be undone.</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="h-10 px-4 rounded-full bg-card text-xs font-semibold text-foreground ring-1 ring-stroke transition hover:bg-card-strong"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNotebook(confirmDeleteId)}
                  disabled={confirmingDelete}
                  className="h-10 px-4 rounded-full bg-accent text-xs font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-accent-strong disabled:opacity-50"
                >
                  {confirmingDelete ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <StreakBadge />
        <Link
          href="/app/settings"
          className="p-2 rounded-full bg-card ring-1 ring-stroke hover:bg-card-strong transition-colors"
        >
          <svg className="w-5 h-5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink-soft">
            Start or join
          </p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">
            Create a notebook or join with a code.
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            You can share by link later, or keep things private.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {hasList ? (
            <button
              type="button"
              onClick={handleCreateNotebook}
              className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-accent-strong"
            >
              {createStatus === "pending" ? "Creating..." : "Create notebook"}
            </button>
          ) : null}
          <div className="flex items-center gap-2 rounded-full bg-input px-3 py-2 text-sm ring-1 ring-input-border">
            <input
              value={inviteCode}
              onChange={(event) => {
                setInviteCode(event.target.value.toUpperCase());
                setJoinStatus("idle");
                setJoinMessage(null);
              }}
              placeholder="Invite code"
              className="w-32 bg-transparent text-sm text-foreground placeholder:text-ink-soft focus:outline-none"
            />
            <button
              type="button"
              onClick={handleJoinNotebook}
              className="text-xs font-semibold text-foreground"
            >
              {joinLabel}
            </button>
          </div>
        </div>
      </div>

      {!hasList ? (
        <div className="mt-12 rounded-3xl border border-dashed border-stroke bg-card/50 p-10 text-center shadow-[0_24px_60px_var(--shadow)]">
          <p className="text-sm uppercase tracking-[0.25em] text-ink-soft">
            Empty for now
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-foreground font-[family:var(--font-display)]">
            Create your first notebook, whenever you are in the mood.
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Journals are for thoughts and experiences, not tasks. You can keep it
            solo or invite others.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCreateNotebook}
              className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-accent-strong"
            >
              {createStatus === "pending" ? "Creating..." : "Create notebook"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {journals.map((journal) => (
            <article
              key={journal.id}
              className="rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)] transition hover:-translate-y-0.5 cursor-pointer"
              onClick={() => window.location.assign(`/app/journals/${journal.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
                    Notebook
                  </p>
                  <h2 className="mt-3 text-xl font-semibold text-foreground">
                    {journal.name}
                  </h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    {journal.description || "Tap to write"}
                  </p>
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === journal.id ? null : journal.id)}
                    className="p-2 rounded-full hover:bg-ink/10 transition-colors"
                  >
                    <svg className="w-5 h-5 text-ink-soft" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {openMenuId === journal.id && (
                    <div className="absolute right-0 mt-1 w-40 rounded-xl bg-card-strong ring-1 ring-stroke shadow-lg overflow-hidden z-10">
                      <button
                        onClick={() => { setOpenMenuId(null); window.location.assign(`/app/journals/${journal.id}`); }}
                        className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-ink/10 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Open
                      </button>
                        {journal.owner_id === userId && (
                          <>
                          <button
                              onClick={() => { setOpenMenuId(null); handleCreateInvite(journal.id); }}
                              className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-ink/10 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); setRenamingId(journal.id); setRenameValue(journal.name); }}
                            className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-ink/10 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Rename
                          </button>
                            <button
                              onClick={() => { setOpenMenuId(null); handleArchiveNotebook(journal.id); }}
                              className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-ink/10 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              Archive
                            </button>
                            <button
                              onClick={() => { setOpenMenuId(null); setConfirmDeleteId(journal.id); }}
                              className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-ink/10 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3h6m-7 4h8m-9 0h10l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7" />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
                    </div>
                  )}
                </div>
              </div>
              {renamingId === journal.id ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    className="h-10 w-full rounded-full bg-input px-4 text-sm text-foreground ring-1 ring-input-border focus:outline-none focus:ring-2 focus:ring-accent/40 sm:w-64"
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameNotebook(journal.id)}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-accent-strong"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(null);
                      setRenameValue("");
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-card px-4 text-xs font-semibold text-foreground ring-1 ring-stroke transition hover:-translate-y-0.5 hover:bg-card-strong"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {archivedJournals.length > 0 ? (
        <div className="mt-12">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
            Archived notebooks
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {archivedJournals.map((journal) => (
              <article
                key={journal.id}
                className="rounded-3xl bg-card/60 p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {journal.name}
                </h3>
                <p className="mt-2 text-sm text-ink-muted">
                  Archived. Restore anytime.
                </p>
                {journal.owner_id === userId ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestoreNotebook(journal.id)}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-card px-3 text-xs font-semibold text-foreground ring-1 ring-stroke transition hover:-translate-y-0.5 hover:bg-card-strong"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotebook(journal.id)}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-card px-3 text-xs font-semibold text-foreground ring-1 ring-stroke transition hover:-translate-y-0.5 hover:bg-card-strong"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {createStatus === "error" ? (
        <p className="mt-4 text-xs text-ink-soft">
          {createMessage ?? "Something went wrong creating the notebook. Try again."}
        </p>
      ) : null}
      {joinStatus === "error" ? (
        <p className="mt-4 text-xs text-ink-soft">
          {joinMessage ?? "That invite code did not work. Check the code and try again."}
        </p>
      ) : null}
      {hasJournals && !hasList ? (
        <p className="mt-4 text-xs text-ink-soft">
          Create your first notebook to enable gentle reminder settings.
        </p>
      ) : null}
    </div>
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
