import { useDeferredValue, useEffect, useRef, useState } from "react";
import { JournalTemplatePicker } from "@/components/JournalTemplatePicker";
import { Glyph } from "@/components/Glyph";
import { InteractiveSurface } from "@/components/InteractiveSurface";
import { PortalShell } from "@/components/PortalShell";
import { Reveal } from "@/components/Reveal";
import { StreakBadge } from "@/components/StreakBadge";
import { api, clearToken, type Journal, type User } from "@/lib/api";
import { ensureUserEncryption, generateJournalKey, hasLocalPrivateKey, wrapJournalKeyForUser } from "@/lib/crypto";
import { getBackendTimestamp } from "@/lib/dates";
import { getExistingPushSubscription, unsubscribePushSubscription } from "@/lib/pwa";

type AppClientProps = {
  journals: Journal[];
  activeView?: "home" | "journal";
};

const templates: Record<string, { label: string; icon: "book" | "heart" | "spark" | "grid" | "leaf"; tone: string }> = {
  free_write: { label: "Free Write", icon: "book", tone: "cocoon-tone-slate" },
  reflection: { label: "Reflection", icon: "spark", tone: "cocoon-tone-indigo" },
  gratitude: { label: "Gratitude", icon: "leaf", tone: "cocoon-tone-amber" },
  couple: { label: "Shared Journal", icon: "heart", tone: "cocoon-tone-rose" },
  cbt: { label: "CBT Focus", icon: "spark", tone: "cocoon-tone-blue" },
  habit: { label: "Habit Tracker", icon: "grid", tone: "cocoon-tone-emerald" },
};

export default function AppClient({ journals, activeView = "home" }: AppClientProps) {
  const [user, setUser] = useState<User | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinStatus, setJoinStatus] = useState<"idle" | "pending" | "error">("idle");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api.profile.get().then(setUser).catch(() => {});
    void api.prompts.daily(undefined, "free_write").then((data) => setPrompt(data.prompt || "")).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function refresh() {
    window.location.reload();
  }

  async function handleCreateWithTemplate(templateType: string) {
    try {
      const profile = user ?? (await api.profile.get());
      if (!user) {
        setUser(profile);
      }

      const encryption = await ensureUserEncryption(profile);
      if (encryption.needsRecovery || !encryption.publicKey) {
        setStatusMessage(
          profile.has_key_backup
            ? "Restore this device from Settings with your recovery passphrase before creating encrypted journals here."
            : "This browser is missing your private journal key, so new encrypted journals cannot be created here yet.",
        );
        return;
      }

      const journalKey = await generateJournalKey();
      const encryptedKey = await wrapJournalKeyForUser(journalKey, encryption.publicKey);
      const journal = await api.journals.create({
        template_type: templateType,
        encrypted_key: encryptedKey,
        key_version: 1,
      });
      window.location.assign(`/app/journals/${journal.id}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "That journal could not be created right now.");
    }
  }

  async function handleJoinNotebook() {
    if (!inviteCode.trim()) return;
    setJoinStatus("pending");
    try {
      const result = await api.invites.accept(inviteCode.trim());
      window.location.assign(`/app/journals/${result.journalId}`);
    } catch {
      setJoinStatus("error");
    }
  }

  async function handleCreateInvite(journalId: string) {
    const result = await api.invites.create(journalId);
    setShareUrl(`${window.location.origin}/app/invite/${result.code}`);
    setShareCode(result.code);
    setShowShareModal(true);
  }

  async function handleRenameNotebook(journalId: string) {
    if (!renameValue.trim()) return;
    await api.journals.update(journalId, { name: renameValue.trim() });
    await refresh();
  }

  async function handleArchiveNotebook(journalId: string) {
    await api.journals.update(journalId, { archived: true });
    await refresh();
  }

  async function handleRestoreNotebook(journalId: string) {
    await api.journals.update(journalId, { archived: false });
    await refresh();
  }

  async function handleDeleteNotebook(journalId: string) {
    await api.journals.delete(journalId);
    await refresh();
  }

  async function handleSignOut() {
    try {
      const existingSubscription = await getExistingPushSubscription();
      if (existingSubscription?.endpoint) {
        try {
          await api.push.unsubscribe(existingSubscription.endpoint);
        } catch {
          // Server cleanup is best effort during sign-out.
        }

        try {
          await unsubscribePushSubscription();
        } catch {
          // Local cleanup should not block sign-out.
        }
      }
    } catch {
      // Ignore local push cleanup failures and continue with sign-out.
    }

    try {
      await api.auth.signout();
    } catch {
      // Local cleanup still leaves the client signed out if the session is already gone.
    }
    clearToken();
    window.location.assign("/login");
  }

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
  const sortedJournals = [...journals].sort(
    (left, right) => getBackendTimestamp(right.updated_at) - getBackendTimestamp(left.updated_at),
  );
  const activeJournals = sortedJournals.filter((journal) => !journal.archived_at);
  const archivedJournals = sortedJournals.filter((journal) => Boolean(journal.archived_at));
  const journalsInView = activeView === "journal" ? activeJournals : activeJournals.slice(0, 4);

  const visibleJournals = journalsInView.filter((journal) => {
    if (!normalizedSearch) return true;
    const template = templates[journal.template_type || "free_write"] || templates.free_write;
    const haystack = [journal.name, journal.description || "", template.label]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });
  const visibleArchivedJournals = archivedJournals.filter((journal) => {
    if (activeView !== "journal") return false;
    if (!normalizedSearch) return true;
    const template = templates[journal.template_type || "free_write"] || templates.free_write;
    const haystack = [journal.name, journal.description || "", template.label]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });
  const shellTitle =
    activeView === "journal"
      ? "Your journals."
      : `Good day, ${user?.display_name?.split(" ")[0] || "friend"}.`;
  const shellSubtitle =
    activeView === "journal"
      ? `${visibleJournals.length + visibleArchivedJournals.length} space${visibleJournals.length + visibleArchivedJournals.length === 1 ? "" : "s"} in view.`
      : activeJournals.length > 0
        ? `${activeJournals.length} active journal${activeJournals.length === 1 ? "" : "s"}, showing the most recent ${Math.min(4, activeJournals.length)}.`
        : "Create your first journal to start building your recent list.";
  const sectionTitle = normalizedSearch ? "Matching spaces" : activeView === "journal" ? "All spaces" : "Recently edited";
  const shouldPromptRecoverySetup = Boolean(user?.public_key && user && hasLocalPrivateKey(user.id) && !user.has_key_backup);

  const rightRail = (
      <div className="flex h-full flex-col gap-6">
        {shouldPromptRecoverySetup ? (
          <div className="cocoon-card border-primary/20 bg-primary-soft p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Recovery recommended</p>
            <h3 className="mt-3 font-display text-2xl text-foreground">Save a recovery passphrase</h3>
            <p className="mt-3 text-sm leading-7 text-foreground-soft">
              This device already has your journal key. Save a recovery passphrase once so future devices can unlock encrypted journals too.
            </p>
            <button
              type="button"
              onClick={() => window.location.assign("/app/settings")}
              className="cocoon-button cocoon-button-primary mt-4 w-full"
            >
              Set recovery passphrase
            </button>
          </div>
        ) : null}
        <div className="cocoon-panel p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Today&apos;s prompt</p>
          <p className="mt-3 font-display text-lg italic leading-7 text-foreground sm:mt-4 sm:text-xl sm:leading-8">
            {prompt || "What are you carrying into today, and what would feel lighter by tonight?"}
          </p>
        </div>
        {statusMessage ? (
          <div className="cocoon-card p-5">
            <p className="text-sm leading-7 text-foreground-soft">{statusMessage}</p>
          </div>
        ) : null}
      {activeView === "home" ? <StreakBadge variant="rail" /> : null}
      <div className="cocoon-card p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Join a space</p>
        <input
          value={inviteCode}
          onChange={(event) => {
            setInviteCode(event.target.value.toUpperCase());
            setJoinStatus("idle");
          }}
          placeholder="Invite code"
          className="cocoon-input mt-4 px-4 py-3 text-sm"
        />
        <button type="button" onClick={handleJoinNotebook} className="cocoon-button cocoon-button-secondary mt-3 w-full">
          {joinStatus === "pending" ? "Joining..." : "Join with code"}
        </button>
        {joinStatus === "error" ? <p className="mt-3 text-sm text-danger">That invite code did not work.</p> : null}
      </div>
      <button type="button" onClick={handleSignOut} className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-foreground-soft">
        <Glyph name="logout" className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );

  return (
    <>
      {showTemplatePicker ? <JournalTemplatePicker onSelect={handleCreateWithTemplate} onClose={() => setShowTemplatePicker(false)} /> : null}

      {showShareModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="cocoon-overlay absolute inset-0" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-md cocoon-panel p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Share notebook</p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Invite someone in</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Link</label>
                <input readOnly value={shareUrl} className="cocoon-input mt-2 px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Code</label>
                <input readOnly value={shareCode} className="cocoon-input mt-2 px-4 py-3 text-sm" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="cocoon-overlay absolute inset-0" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative w-full max-w-sm cocoon-panel p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-danger">Delete notebook</p>
            <h2 className="mt-2 font-display text-3xl text-foreground">This space will be removed.</h2>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-full border border-stroke px-4 py-2 text-sm font-semibold text-foreground-soft">Cancel</button>
              <button type="button" onClick={() => handleDeleteNotebook(confirmDeleteId)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      <PortalShell
        active={activeView}
        eyebrow={activeView === "journal" ? "Journal Library" : "Home"}
        title={shellTitle}
        subtitle={shellSubtitle}
        user={user}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={activeView === "journal" ? "Search journals" : "Find a space"}
        headerAction={
          <button
            type="button"
            onClick={() => setShowTemplatePicker(true)}
            className="cocoon-glass-subtle flex h-10 w-10 items-center justify-center rounded-full border border-stroke text-primary md:hidden sm:h-11 sm:w-11"
          >
            <Glyph name="plus" className="h-5 w-5" />
          </button>
        }
        primaryAction={
          <button type="button" onClick={() => setShowTemplatePicker(true)} className="cocoon-button cocoon-button-primary w-full">
            <Glyph name="plus" className="h-4 w-4" />
            New space
          </button>
        }
        rightRail={rightRail}
      >
        <Reveal delay={40}>
          <InteractiveSurface className="rounded-[2.5rem]">
            <section className="cocoon-hero-card relative overflow-hidden rounded-[1.9rem] px-4 py-5 text-white shadow-[0_24px_60px_var(--shadow)] sm:rounded-[2.25rem] sm:px-7 sm:py-9">
              <div className="relative grid gap-5 sm:gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
                <div>
                  <p className="inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">Overview</p>
                  <h2 className="mt-4 font-display text-[1.85rem] leading-tight sm:mt-6 sm:text-[2.7rem] lg:text-5xl">
                    {activeView === "journal" ? "Your journals." : "Welcome back."}
                    <span className="block italic text-white/88">
                      {activeView === "journal" ? "Everything you can open is here." : "Pick up one of your recent spaces."}
                    </span>
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-white/76 sm:mt-5 sm:leading-7">
                    {activeView === "journal"
                      ? "Open an existing journal, create a new one, or search across everything you can access."
                      : "Jump into the journals you touched most recently, invite someone into a shared space, or start a fresh notebook."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
                  <div className="rounded-[1.35rem] border border-white/14 bg-white/10 p-4 backdrop-blur-md sm:rounded-[1.6rem] sm:p-5">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">
                      {activeView === "journal" ? "Open spaces" : "Recent spaces"}
                    </p>
                    <p className="mt-2 text-[2rem] font-semibold leading-none sm:mt-3 sm:text-4xl">{visibleJournals.length}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/14 bg-white/10 p-4 backdrop-blur-md sm:rounded-[1.6rem] sm:p-5">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">
                      {activeView === "journal" ? "Archived" : "Active library"}
                    </p>
                    <p className="mt-2 text-[2rem] font-semibold leading-none sm:mt-3 sm:text-4xl">
                      {activeView === "journal" ? visibleArchivedJournals.length : activeJournals.length}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </InteractiveSurface>
        </Reveal>

        <section className="mt-7 sm:mt-8">
          <div className="flex items-end justify-between gap-3">
            <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Your journals</p>
            <h3 className="mt-2 font-display text-[2.15rem] leading-tight text-foreground sm:text-4xl">{sectionTitle}</h3>
          </div>
          </div>

          {visibleJournals.length === 0 ? (
            <div className="mt-6 cocoon-panel px-8 py-10 text-center">
              <h4 className="font-display text-3xl text-foreground">
                {normalizedSearch ? "Nothing matched that search." : "No journals yet."}
              </h4>
              <p className="mt-4 text-sm leading-7 text-foreground-soft">
                {normalizedSearch ? "Try a different journal name, type, or phrase." : "Create a blank journal or choose a type to get started."}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 md:grid-cols-2">
              {visibleJournals.map((journal, index) => {
                const template = templates[journal.template_type || "free_write"] || templates.free_write;
                return (
                  <Reveal key={journal.id} delay={index * 70}>
                    <InteractiveSurface className="rounded-[1.75rem]">
                      <article className="cocoon-card cocoon-virtual-card p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <button type="button" onClick={() => window.location.assign(`/app/journals/${journal.id}`)} className="flex-1 text-left">
                            <div className="flex items-start gap-4">
                              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] sm:h-14 sm:w-14 sm:rounded-[1.25rem] ${template.tone}`}>
                                <Glyph name={template.icon} className="h-5 w-5 sm:h-6 sm:w-6" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">{template.label}</p>
                                <h4 className="mt-2 font-display text-[1.55rem] leading-tight text-foreground sm:text-3xl">{journal.name}</h4>
                                <p className="mt-2 text-sm leading-6 text-foreground-soft sm:mt-3 sm:leading-7">
                                  {journal.description || "Open this notebook to continue writing, reflect on prompts, or invite someone in."}
                                </p>
                              </div>
                            </div>
                          </button>
                          <div ref={openMenuId === journal.id ? menuRef : null} className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(openMenuId === journal.id ? null : journal.id)}
                              className="cocoon-glass-subtle flex h-9 w-9 items-center justify-center rounded-full border border-stroke text-foreground-muted sm:h-10 sm:w-10"
                            >
                              <Glyph name="more" className="h-4 w-4" />
                            </button>
                            {openMenuId === journal.id ? (
                              <div className="cocoon-popover absolute right-0 top-12 z-20 w-44 rounded-[1.25rem] p-2">
                                <button type="button" onClick={() => window.location.assign(`/app/journals/${journal.id}`)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-card-muted"><Glyph name="arrow-right" className="h-4 w-4" />Open</button>
                                <button type="button" onClick={() => void handleCreateInvite(journal.id)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-card-muted"><Glyph name="share" className="h-4 w-4" />Share</button>
                                <button type="button" onClick={() => { setRenamingId(journal.id); setRenameValue(journal.name); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-card-muted"><Glyph name="edit" className="h-4 w-4" />Rename</button>
                                <button type="button" onClick={() => void handleArchiveNotebook(journal.id)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-card-muted"><Glyph name="archive" className="h-4 w-4" />Archive</button>
                                <button type="button" onClick={() => setConfirmDeleteId(journal.id)} className="cocoon-danger-hover flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-danger"><Glyph name="trash" className="h-4 w-4" />Delete</button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {renamingId === journal.id ? (
                          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="cocoon-input px-4 py-3 text-sm" />
                            <button type="button" onClick={() => handleRenameNotebook(journal.id)} className="cocoon-button cocoon-button-primary">Save</button>
                          </div>
                        ) : null}
                      </article>
                    </InteractiveSurface>
                  </Reveal>
                );
              })}
            </div>
          )}
        </section>

        {activeView === "journal" && visibleArchivedJournals.length > 0 ? (
          <section className="mt-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Archived spaces</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {visibleArchivedJournals.map((journal) => (
                <article key={journal.id} className="cocoon-soft-card cocoon-virtual-card p-5">
                  <h4 className="font-display text-2xl text-foreground">{journal.name}</h4>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => handleRestoreNotebook(journal.id)} className="rounded-full border border-stroke px-4 py-2 text-sm font-semibold text-foreground">Restore</button>
                    <button type="button" onClick={() => setConfirmDeleteId(journal.id)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-danger">Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </PortalShell>
    </>
  );
}
