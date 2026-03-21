import { useEffect, useRef, useState } from "react";
import { DailyPromptCard } from "@/components/DailyPromptCard";
import { Glyph } from "@/components/Glyph";
import { PortalShell } from "@/components/PortalShell";
import {
  api,
  type Entry as ApiEntry,
  type Member,
  type User,
} from "@/lib/api";
import {
  decryptJournalBody,
  ensureUserEncryption,
  encryptJournalBody,
  generateJournalKey,
  wrapJournalKeyForUser,
  unwrapJournalKeyForUser,
} from "@/lib/crypto";

type Journal = {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  role?: string;
  template_type?: string;
};

type ResolvedEntry = ApiEntry & {
  resolvedBody: string;
};

type JournalClientProps = {
  journal: Journal;
  entries: ApiEntry[];
  members: Member[];
  user: User;
};

const templateCopy: Record<string, { eyebrow: string; tone: string }> = {
  couple: {
    eyebrow: "Shared Journal",
    tone: "One journal shared between the people writing in it.",
  },
  cbt: {
    eyebrow: "CBT Focus",
    tone: "Track patterns, notice triggers, and work through them clearly.",
  },
  habit: {
    eyebrow: "Habit Tracker",
    tone: "Keep short entries around the routines you want to maintain.",
  },
  reflection: {
    eyebrow: "Reflection",
    tone: "Look back on the day and write through what mattered.",
  },
  gratitude: {
    eyebrow: "Gratitude",
    tone: "Keep a record of what felt kind, steady, or worth remembering.",
  },
  free_write: {
    eyebrow: "Journal",
    tone: "A blank space for notes, thoughts, and longer entries.",
  },
  structured: {
    eyebrow: "Structured Journal",
    tone: "A guided journal with a clear format for each entry.",
  },
};

export default function JournalClient({ journal, entries, members, user }: JournalClientProps) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [resolvedEntries, setResolvedEntries] = useState<ResolvedEntry[]>(
    entries.map((entry) => ({ ...entry, resolvedBody: entry.body || "" })),
  );
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [renameValue, setRenameValue] = useState(journal.name);
  const [descValue, setDescValue] = useState(journal.description || "");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
  const [keyLoading, setKeyLoading] = useState(true);
  const [keyNotice, setKeyNotice] = useState<string | null>(null);
  const [journalKey, setJournalKey] = useState<CryptoKey | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.journals.settings
      .get(journal.id)
      .then((data) => setAiEnabled(data.ai_prompts_enabled))
      .catch(() => {});
  }, [journal.id]);

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
    let cancelled = false;

    async function loadEncryptedJournal() {
      setKeyLoading(true);
      setKeyNotice(null);

      try {
        const encryption = await ensureUserEncryption(user);
        if (cancelled) return;

        const keyState = await api.journals.keys.get(journal.id);
        if (cancelled) return;

        let activeKey: CryptoKey | null = null;

        if (encryption.needsRecovery) {
          setKeyNotice(
            user.has_key_backup
              ? "Restore this device in Settings with your recovery passphrase to open encrypted entries here."
              : "This browser is missing your private journal key, so encrypted entries cannot be opened here yet.",
          );
        } else if (keyState.current?.encrypted_key) {
          activeKey = await unwrapJournalKeyForUser(user.id, keyState.current.encrypted_key);
        } else if (journal.role === "owner" && encryption.publicKey) {
          activeKey = await generateJournalKey();
          const encryptedSelfKey = await wrapJournalKeyForUser(activeKey, encryption.publicKey);
          await api.journals.keys.share(journal.id, {
            recipients: [{ user_id: user.id, encrypted_key: encryptedSelfKey, key_version: 1 }],
          });
        } else {
          setKeyNotice("Secure access is still being shared to this device. Ask an existing member to open the journal once.");
        }

        if (!activeKey) {
          if (!cancelled) {
            setJournalKey(null);
            setResolvedEntries(
              entries.map((entry) => ({
                ...entry,
                resolvedBody: entry.body || (entry.encrypted_body ? "Encrypted entry unavailable on this device." : ""),
              })),
            );
          }
          return;
        }

        if (!cancelled) {
          setJournalKey(activeKey);
        }

        const membersMissingKeys = keyState.members.filter(
          (member) => member.user_id !== user.id && !member.has_key && member.public_key,
        );
        if (membersMissingKeys.length > 0) {
          const recipients = await Promise.all(
            membersMissingKeys.map(async (member) => ({
              user_id: member.user_id,
              encrypted_key: await wrapJournalKeyForUser(activeKey as CryptoKey, member.public_key as string),
              key_version: 1,
            })),
          );
          await api.journals.keys.share(journal.id, { recipients });
        }

        const decryptedEntries = await Promise.all(
          entries.map(async (entry) => {
            if (entry.encrypted_body && entry.nonce) {
              try {
                const resolvedBody = await decryptJournalBody(activeKey as CryptoKey, entry.encrypted_body, entry.nonce);
                return { ...entry, resolvedBody };
              } catch {
                return {
                  ...entry,
                  resolvedBody: entry.body || "Encrypted entry unavailable on this device.",
                };
              }
            }

            return {
              ...entry,
              resolvedBody: entry.body || "",
            };
          }),
        );

        if (!cancelled) {
          setResolvedEntries(decryptedEntries);
        }
      } catch (error) {
        if (!cancelled) {
          setJournalKey(null);
          setKeyNotice(error instanceof Error ? error.message : "Encrypted access could not be prepared.");
          setResolvedEntries(
            entries.map((entry) => ({
              ...entry,
              resolvedBody: entry.body || (entry.encrypted_body ? "Encrypted entry unavailable on this device." : ""),
            })),
          );
        }
      } finally {
        if (!cancelled) {
          setKeyLoading(false);
        }
      }
    }

    void loadEncryptedJournal();

    return () => {
      cancelled = true;
    };
  }, [entries, journal.id, journal.role, user]);

  function refresh() {
    window.location.reload();
  }

  async function saveEncryptedEntry(body: string, promptId?: string) {
    if (!journalKey) return;
    const encrypted = await encryptJournalBody(journalKey, body.trim());
    await api.entries.create(journal.id, {
      encrypted_body: encrypted.encryptedBody,
      nonce: encrypted.nonce,
      prompt_id: promptId,
    });
  }

  async function handleSaveEntry() {
    if (!draft.trim() || saving || !journalKey) return;
    setSaving(true);
    try {
      await saveEncryptedEntry(draft);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handlePromptReply(payload: { body: string; promptId?: string }) {
    if (saving || !journalKey) return;
    setSaving(true);
    try {
      await saveEncryptedEntry(payload.body, payload.promptId);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateEntry(entryId: string, promptId?: string) {
    if (!editingBody.trim() || !journalKey) return;
    const encrypted = await encryptJournalBody(journalKey, editingBody.trim());
    await api.entries.update(journal.id, entryId, {
      encrypted_body: encrypted.encryptedBody,
      nonce: encrypted.nonce,
      prompt_id: promptId,
    });
    refresh();
  }

  async function handleShare() {
    const result = await api.invites.create(journal.id);
    setShareUrl(`${window.location.origin}/app/invite/${result.code}`);
    setShareCode(result.code);
    setShowShareModal(true);
    setShowMenu(false);
  }

  async function handleSaveSettings() {
    if (renameValue.trim() !== journal.name || descValue.trim() !== (journal.description || "")) {
      await api.journals.update(journal.id, {
        name: renameValue.trim(),
        description: descValue.trim() || undefined,
      });
    }
    await api.journals.settings.update(journal.id, { ai_prompts_enabled: aiEnabled });
    refresh();
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    if (confirmAction === "archive") {
      await api.journals.update(journal.id, { archived: true });
    } else {
      await api.journals.delete(journal.id);
    }
    window.location.assign("/app");
  }

  const subtitle =
    journal.description ||
    templateCopy[journal.template_type || "free_write"]?.tone ||
    templateCopy.free_write.tone;

  const writingDisabledReason = keyLoading
    ? "Preparing secure writing..."
    : keyNotice;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleEntries = resolvedEntries.filter((entry) => {
    if (!normalizedSearch) return true;
    const author = members.find((member) => member.user_id === entry.author_id);
    const searchableText = [
      entry.resolvedBody,
      entry.author_id === user.id ? "you" : author?.display_name || "collaborator",
      new Date(entry.created_at).toLocaleDateString(),
    ]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(normalizedSearch);
  });

  const rightRail = (
    <div className="flex h-full flex-col gap-6">
      <div className="cocoon-card p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Members</p>
        <div className="mt-4 space-y-3">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between rounded-[1.2rem] bg-card-muted px-4 py-3">
              <div>
                <p className="font-semibold text-foreground">{member.user_id === user.id ? "You" : member.display_name || "Collaborator"}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-foreground-muted">{member.role}</p>
              </div>
              <Glyph name="people" className="h-4 w-4 text-primary" />
            </div>
          ))}
        </div>
      </div>

      <div className="cocoon-card p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Space actions</p>
        <div className="mt-4 flex flex-col gap-3">
          <button type="button" onClick={handleShare} className="cocoon-button cocoon-button-secondary w-full">
            <Glyph name="share" className="h-4 w-4" />
            Share journal
          </button>
          {journal.role === "owner" ? (
            <button
              type="button"
              onClick={() => setConfirmAction("archive")}
              className="rounded-full border border-stroke px-4 py-3 text-sm font-semibold text-foreground"
            >
              Archive
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {showSettings ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="cocoon-overlay absolute inset-0" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md cocoon-panel p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Journal settings</p>
            <div className="mt-5 space-y-4">
              <input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="cocoon-input px-4 py-3 text-sm"
              />
              <input
                value={descValue}
                onChange={(event) => setDescValue(event.target.value)}
                placeholder="Short note for this space"
                className="cocoon-input px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={() => setAiEnabled((value) => !value)}
                className="flex w-full items-center justify-between rounded-[1.25rem] border border-stroke bg-card-muted px-4 py-4 text-left"
              >
                <div>
                  <span className="font-semibold text-foreground">Daily prompt for this journal</span>
                  <p className="mt-1 text-sm text-foreground-soft">Turn the prompt card on or off for this space only.</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    aiEnabled
                      ? "bg-primary text-[color:var(--on-primary,#0b1831)]"
                      : "bg-[color:var(--glass-subtle)] border border-stroke text-foreground-muted"
                  }`}
                >
                  {aiEnabled ? "On" : "Off"}
                </span>
              </button>
              <button type="button" onClick={handleSaveSettings} className="cocoon-button cocoon-button-primary w-full">
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showShareModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="cocoon-overlay absolute inset-0" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-md cocoon-panel p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Share journal</p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Share this journal</h2>
            <div className="mt-5 space-y-4">
              <input readOnly value={shareUrl} className="cocoon-input px-4 py-3 text-sm" />
              <input readOnly value={shareCode} className="cocoon-input px-4 py-3 text-sm" />
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="cocoon-overlay absolute inset-0" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-sm cocoon-panel p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-danger">
              {confirmAction === "archive" ? "Archive journal" : "Delete journal"}
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">
              {confirmAction === "archive" ? "This journal will be archived." : "This action cannot be undone."}
            </h2>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmAction(null)} className="rounded-full border border-stroke px-4 py-2 text-sm font-semibold text-foreground-soft">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmAction} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PortalShell
        active="journal"
        eyebrow={templateCopy[journal.template_type || "free_write"]?.eyebrow || "Journal"}
        title={journal.name}
        subtitle={subtitle}
        user={user}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search entries"
        headerAction={
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((value) => !value)}
              className="cocoon-glass-subtle flex h-10 w-10 items-center justify-center rounded-full border border-stroke text-foreground-muted"
            >
              <Glyph name="more" className="h-4 w-4" />
            </button>
            {showMenu ? (
              <div className="cocoon-popover absolute right-0 top-12 z-20 w-48 rounded-[1.25rem] p-2">
                <button type="button" onClick={() => { setShowSettings(true); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-card-muted"><Glyph name="settings" className="h-4 w-4" />Settings</button>
                <button type="button" onClick={handleShare} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-card-muted"><Glyph name="share" className="h-4 w-4" />Share</button>
                {journal.role === "owner" ? (
                  <button type="button" onClick={() => setConfirmAction("delete")} className="cocoon-danger-hover flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-danger">
                    <Glyph name="trash" className="h-4 w-4" />
                    Delete
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        }
        rightRail={rightRail}
      >
        <section className="grid gap-5">
          <DailyPromptCard journalId={journal.id} disabledReason={writingDisabledReason} onSubmit={handlePromptReply} />

          <div className="cocoon-card p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">
              {journal.template_type === "couple" ? "Shared response" : "New entry"}
            </p>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={journal.template_type === "couple" ? "Write what you want your partner to read..." : "Write your next note..."}
              className="cocoon-input mt-4 min-h-36 resize-none px-4 py-4 text-sm leading-7"
              disabled={Boolean(writingDisabledReason)}
            />
            {writingDisabledReason ? <p className="mt-3 text-sm text-foreground-soft">{writingDisabledReason}</p> : null}
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={handleSaveEntry} disabled={saving || !draft.trim() || Boolean(writingDisabledReason)} className="cocoon-button cocoon-button-primary w-full sm:w-auto">
                {saving ? "Saving..." : "Save entry"}
              </button>
            </div>
          </div>

          <section className="grid gap-4">
            {visibleEntries.length === 0 ? (
              <div className="cocoon-panel px-8 py-10 text-center">
                <h3 className="font-display text-3xl text-foreground">
                  {normalizedSearch ? "No entries matched that search." : "Nothing written yet."}
                </h3>
                <p className="mt-4 text-sm leading-7 text-foreground-soft">
                  {normalizedSearch ? "Try a different phrase, author name, or date." : "Write the first entry to see it here."}
                </p>
              </div>
            ) : (
              visibleEntries.map((entry) => {
                const author = members.find((member) => member.user_id === entry.author_id);
                return (
                  <article key={entry.id} className="cocoon-card p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">
                          {entry.author_id === user.id ? "You" : author?.display_name || "Collaborator"}
                        </p>
                        <p className="mt-1 text-sm text-foreground-soft">
                          {new Date(entry.created_at).toLocaleDateString()} · {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {entry.author_id === user.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(entry.id);
                            setEditingBody(entry.resolvedBody);
                          }}
                          className="text-sm font-semibold text-primary"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>

                    {editingId === entry.id ? (
                      <div className="mt-4 space-y-3">
                        <textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} className="cocoon-input min-h-32 resize-none px-4 py-4 text-sm leading-7" />
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button type="button" onClick={() => handleUpdateEntry(entry.id, entry.prompt_id || undefined)} className="cocoon-button cocoon-button-primary w-full sm:w-auto">Save</button>
                          <button type="button" onClick={() => { setEditingId(null); setEditingBody(""); }} className="cocoon-button cocoon-button-secondary w-full sm:w-auto">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-foreground">{entry.resolvedBody}</p>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </section>
      </PortalShell>
    </>
  );
}
