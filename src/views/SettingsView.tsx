import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { Glyph } from "@/components/Glyph";
import { PortalShell } from "@/components/PortalShell";
import { api, type AppSettings, type User } from "@/lib/api";
import {
  createRecoveryKeyBackup,
  ensureUserEncryption,
  hasLocalPrivateKey,
  restoreKeyPairFromBackup,
} from "@/lib/crypto";
import {
  dispatchSettingsUpdated,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from "@/lib/notifications";

function ToggleRow({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full flex-col items-start gap-3 rounded-[1.4rem] border border-stroke bg-card-muted px-4 py-4 text-left sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-foreground-soft">{description}</p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          enabled
            ? "bg-primary text-[color:var(--on-primary,#0b1831)]"
            : "border border-stroke bg-[color:var(--glass-subtle)] text-foreground-muted"
        }`}
      >
        {enabled ? "On" : "Off"}
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [notificationPermission, setNotificationPermission] = useState(getBrowserNotificationPermission());
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedPreferences, setSavedPreferences] = useState(false);
  const [encryptionNotice, setEncryptionNotice] = useState<string | null>(null);
  const [recoveryPassphrase, setRecoveryPassphrase] = useState("");
  const [recoveryPassphraseConfirm, setRecoveryPassphraseConfirm] = useState("");
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [restoringRecovery, setRestoringRecovery] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  const hasLocalKey = Boolean(user && hasLocalPrivateKey(user.id));
  const canRestoreHere = Boolean(user && user.has_key_backup && !hasLocalKey);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const [profile, profileSettings] = await Promise.all([
          api.profile.get(),
          api.settings.get(),
        ]);

        if (cancelled) return;

        setUser(profile);
        setDisplayName(profile.display_name || "");
        setSettings(profileSettings);

        const encryption = await ensureUserEncryption(profile);
        if (cancelled) return;

        if (encryption.needsRecovery) {
          setEncryptionNotice(
            profile.has_key_backup
              ? "This browser needs your recovery passphrase before encrypted journals can be opened here."
              : "This browser does not have your private journal key yet, so encrypted journals created elsewhere cannot be opened here.",
          );
        } else if (encryption.created) {
          setEncryptionNotice("Secure journal access was set up for this browser.");
          setSettings((current) =>
            current
              ? {
                  ...current,
                  encryption_ready: true,
                  encryption_backup_ready: Boolean(profile.has_key_backup),
                }
              : current,
          );
          const refreshedProfile = await api.profile.get();
          if (!cancelled) {
            setUser(refreshedProfile);
          }
        } else {
          setEncryptionNotice(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const result = await api.profile.update({ display_name: displayName.trim() });
      setUser(result.user);
      setSavedProfile(true);
      window.setTimeout(() => setSavedProfile(false), 1800);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePreferences() {
    if (!settings) return;
    setSavingPreferences(true);
    try {
      const needsBrowserNotifications =
        settings.notifications_enabled || settings.daily_reminder_enabled;

      if (needsBrowserNotifications && notificationPermission === "default") {
        const nextPermission = await requestBrowserNotificationPermission();
        setNotificationPermission(nextPermission);
      }

      const result = await api.settings.update({
        notifications_enabled: settings.notifications_enabled,
        daily_reminder_enabled: settings.daily_reminder_enabled,
        daily_reminder_time: settings.daily_reminder_time,
        daily_reminder_count: settings.daily_reminder_count,
        quiet_hours_enabled: settings.quiet_hours_enabled,
        quiet_hours_start: settings.quiet_hours_start,
        quiet_hours_end: settings.quiet_hours_end,
      });
      setSettings(result.settings);
      dispatchSettingsUpdated(result.settings);
      setSavedPreferences(true);
      window.setTimeout(() => setSavedPreferences(false), 1800);
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleSaveRecoveryPassphrase() {
    if (!user) return;

    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!hasLocalPrivateKey(user.id)) {
      setRecoveryError("This device still does not have your private journal key.");
      return;
    }

    if (!recoveryPassphrase) {
      setRecoveryError("Enter a recovery passphrase first.");
      return;
    }

    if (recoveryPassphrase.length < 8) {
      setRecoveryError("Use a longer recovery passphrase so it is harder to guess.");
      return;
    }

    if (recoveryPassphrase !== recoveryPassphraseConfirm) {
      setRecoveryError("Those recovery passphrases do not match.");
      return;
    }

    setSavingRecovery(true);
    try {
      const backup = await createRecoveryKeyBackup(user.id, recoveryPassphrase);
      const result = await api.recovery.save(backup);
      setUser(result.user);
      setSettings((current) =>
        current
          ? { ...current, encryption_ready: true, encryption_backup_ready: true }
          : current,
      );
      setEncryptionNotice("This account can now restore its journal key on another device.");
      setRecoverySuccess(
        result.user.has_key_backup
          ? "Recovery passphrase saved. New devices can restore this journal key now."
          : "Recovery backup saved.",
      );
      setRecoveryPassphrase("");
      setRecoveryPassphraseConfirm("");
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : "Recovery backup could not be saved.");
    } finally {
      setSavingRecovery(false);
    }
  }

  async function handleRestoreDevice() {
    if (!user) return;

    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!restorePassphrase) {
      setRecoveryError("Enter your recovery passphrase to unlock this device.");
      return;
    }

    setRestoringRecovery(true);
    try {
      const result = await api.recovery.get();
      if (!result.backup) {
        throw new Error("This account does not have a recovery backup yet.");
      }

      await restoreKeyPairFromBackup(user, result.backup, restorePassphrase);
      const refreshedProfile = await api.profile.get();
      setUser(refreshedProfile);
      setSettings((current) =>
        current
          ? {
              ...current,
              encryption_ready: true,
              encryption_backup_ready: Boolean(refreshedProfile.has_key_backup),
            }
          : current,
      );
      setEncryptionNotice("Secure journal access was restored on this browser.");
      setRecoverySuccess("This device can now open and create encrypted journals.");
      setRestorePassphrase("");
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : "This device could not be restored.");
    } finally {
      setRestoringRecovery(false);
    }
  }

  return (
    <PortalShell
      active="settings"
      eyebrow="Account"
      title="Settings"
      subtitle="Control your theme, quiet hours, and privacy."
      user={user}
    >
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="cocoon-panel px-7 py-7">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-stroke bg-card-muted text-2xl font-semibold text-primary shadow-[0_16px_30px_var(--shadow-soft)]">
              {user?.avatar_url ? (
                <img
                  alt={user.display_name || "Profile avatar"}
                  className="h-full w-full object-cover"
                  src={user.avatar_url}
                />
              ) : (
                (displayName || "C").slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Profile</p>
              <h2 className="mt-3 font-display text-4xl text-foreground">{displayName || user?.email || "Cocoon user"}</h2>
              <p className="mt-2 text-sm text-foreground-soft">This name appears in collaborative journals, invite lists, and shared spaces.</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                className="cocoon-input mt-2 px-4 py-3 text-base"
              />
            </label>

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile || loading}
              className="cocoon-button cocoon-button-primary"
            >
              {savingProfile ? "Saving..." : savedProfile ? "Saved" : "Save profile"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="cocoon-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Glyph name="spark" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Journal prompts</p>
                <h3 className="mt-1 font-display text-2xl text-foreground">Per journal</h3>
              </div>
            </div>
            <div className="mt-5 rounded-[1.4rem] border border-stroke bg-card-muted px-4 py-4">
              <p className="text-sm leading-7 text-foreground-soft">
                Prompt controls live inside each journal, so you can keep them on for one space and off for another.
              </p>
            </div>
          </section>

          <section className="cocoon-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tertiary-soft text-primary">
                <Glyph name="palette" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Appearance</p>
                <h3 className="mt-1 font-display text-2xl text-foreground">Theme</h3>
              </div>
            </div>
            <div className="mt-5">
              <ThemeToggle inline />
            </div>
          </section>
        </div>
      </section>

      <section className="mt-6 grid gap-6">
        <div className="space-y-6">
          <div className="cocoon-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card-muted text-primary">
                <Glyph name="bell" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Reminders</p>
                <h3 className="mt-1 font-display text-2xl text-foreground">Alerts & focus</h3>
              </div>
            </div>

            {settings ? (
              <div className="mt-5 space-y-4">
                <ToggleRow
                  title="Activity notifications"
                  description="Allow Cocoon to surface invite and journal activity alerts."
                  enabled={settings.notifications_enabled}
                  onToggle={() => setSettings((current) => current ? { ...current, notifications_enabled: !current.notifications_enabled } : current)}
                />
                <ToggleRow
                  title="Daily reminder"
                  description="Send a gentle browser reminder for your daily entry on this device."
                  enabled={settings.daily_reminder_enabled}
                  onToggle={() => setSettings((current) => current ? { ...current, daily_reminder_enabled: !current.daily_reminder_enabled } : current)}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Reminder time</span>
                    <input
                      type="time"
                      value={settings.daily_reminder_time}
                      onChange={(event) => setSettings((current) => current ? { ...current, daily_reminder_time: event.target.value } : current)}
                      className="cocoon-input mt-2 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Reminder nudges</span>
                    <select
                      value={settings.daily_reminder_count}
                      onChange={(event) =>
                        setSettings((current) => current ? { ...current, daily_reminder_count: Number(event.target.value) } : current)
                      }
                      className="cocoon-input mt-2 px-4 py-3 text-sm"
                    >
                      <option value={1}>1 reminder</option>
                      <option value={2}>2 reminders</option>
                      <option value={3}>3 reminders</option>
                    </select>
                  </label>
                </div>
                {settings.daily_reminder_enabled && notificationPermission !== "granted" ? (
                  <div className="rounded-[1.2rem] border border-stroke bg-card-muted px-4 py-4 text-sm leading-6 text-foreground-soft">
                    {notificationPermission === "unsupported"
                      ? "This browser does not support the notification API Cocoon uses for reminders."
                      : notificationPermission === "denied"
                      ? "Browser notifications are currently blocked for Cocoon in this browser."
                      : "Cocoon will ask for browser notification access so daily reminders can appear here."}
                  </div>
                ) : null}
                <ToggleRow
                  title="Quiet hours"
                  description="Mute non-essential notifications during your evening window."
                  enabled={settings.quiet_hours_enabled}
                  onToggle={() => setSettings((current) => current ? { ...current, quiet_hours_enabled: !current.quiet_hours_enabled } : current)}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Starts</span>
                    <input
                      type="time"
                      value={settings.quiet_hours_start}
                      onChange={(event) => setSettings((current) => current ? { ...current, quiet_hours_start: event.target.value } : current)}
                      className="cocoon-input mt-2 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Ends</span>
                    <input
                      type="time"
                      value={settings.quiet_hours_end}
                      onChange={(event) => setSettings((current) => current ? { ...current, quiet_hours_end: event.target.value } : current)}
                      className="cocoon-input mt-2 px-4 py-3 text-sm"
                    />
                  </label>
                </div>
                <button type="button" onClick={handleSavePreferences} disabled={savingPreferences} className="cocoon-button cocoon-button-primary w-full">
                  {savingPreferences ? "Saving..." : savedPreferences ? "Saved" : "Save reminder settings"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="cocoon-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card-muted text-primary">
                <Glyph name="lock" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Privacy & Security</p>
                <h3 className="mt-1 font-display text-2xl text-foreground">Journal privacy</h3>
              </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-stroke bg-card-muted px-4 py-4">
              <p className="text-sm leading-7 text-foreground-soft">
                {encryptionNotice || (loading ? "Preparing journal privacy on this device." : "Entries are encrypted on this device before they sync.")}
              </p>
            </div>

            {user && hasLocalKey && !user.has_key_backup ? (
              <div className="mt-5 rounded-[1.4rem] border border-primary/20 bg-primary-soft px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Recommended next step</p>
                <p className="mt-3 text-sm leading-7 text-foreground-soft">
                  Save a recovery passphrase now. Without it, the same account cannot unlock encrypted journals on a new browser or device.
                </p>
              </div>
            ) : null}

            <div className="mt-5 rounded-[1.4rem] border border-stroke bg-card-muted px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Recovery backup</p>
              <p className="mt-3 text-sm leading-7 text-foreground-soft">
                {user?.has_key_backup
                  ? "A recovery backup is saved for this account, so you can unlock encrypted journals on another device with your passphrase."
                  : "Save a recovery passphrase on a device that already has your key so future devices can restore it."}
              </p>
            </div>

            {user && hasLocalKey ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Recovery passphrase</span>
                    <input
                      type="password"
                      value={recoveryPassphrase}
                      onChange={(event) => setRecoveryPassphrase(event.target.value)}
                      placeholder="At least 8 characters"
                      className="cocoon-input mt-2 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Confirm passphrase</span>
                    <input
                      type="password"
                      value={recoveryPassphraseConfirm}
                      onChange={(event) => setRecoveryPassphraseConfirm(event.target.value)}
                      placeholder="Repeat passphrase"
                      className="cocoon-input mt-2 px-4 py-3 text-sm"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSaveRecoveryPassphrase}
                  disabled={savingRecovery}
                  className="cocoon-button cocoon-button-primary w-full"
                >
                  {savingRecovery
                    ? "Saving..."
                    : user.has_key_backup
                    ? "Update recovery passphrase"
                    : "Save recovery passphrase"}
                </button>
              </div>
            ) : null}

            {canRestoreHere ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.4rem] border border-stroke bg-card-muted px-4 py-4">
                  <p className="text-sm leading-7 text-foreground-soft">
                    This account already has a recovery backup. Enter that passphrase once to unlock encrypted journals on this browser.
                  </p>
                </div>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Recovery passphrase</span>
                  <input
                    type="password"
                    value={restorePassphrase}
                    onChange={(event) => setRestorePassphrase(event.target.value)}
                    placeholder="Enter your existing passphrase"
                    className="cocoon-input mt-2 px-4 py-3 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRestoreDevice}
                  disabled={restoringRecovery}
                  className="cocoon-button cocoon-button-primary w-full"
                >
                  {restoringRecovery ? "Restoring..." : "Restore this device"}
                </button>
              </div>
            ) : null}

            {user && !hasLocalKey && !user.has_key_backup ? (
              <div className="mt-5 rounded-[1.4rem] border border-stroke bg-card-muted px-4 py-4">
                <p className="text-sm leading-7 text-foreground-soft">
                  No recovery backup is saved for this account yet. Open Cocoon on the original device, then save a recovery passphrase here first.
                </p>
              </div>
            ) : null}

            {recoveryError ? (
              <div className="mt-5 rounded-[1.4rem] border border-danger/30 bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
                {recoveryError}
              </div>
            ) : null}

            {recoverySuccess ? (
              <div className="mt-5 rounded-[1.4rem] border border-stroke bg-primary-soft px-4 py-4 text-sm leading-6 text-primary">
                {recoverySuccess}
              </div>
            ) : null}
          </div>
        </div>

      </section>
    </PortalShell>
  );
}
