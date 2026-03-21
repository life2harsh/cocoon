import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { Glyph } from "@/components/Glyph";
import { PortalShell } from "@/components/PortalShell";
import { api, type AppSettings, type User } from "@/lib/api";
import { ensureUserEncryption } from "@/lib/crypto";
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
          setEncryptionNotice("This browser does not have your private journal key yet, so encrypted journals created elsewhere cannot be opened here.");
        } else if (encryption.created) {
          setEncryptionNotice("Secure journal access was set up for this browser.");
          setSettings((current) => current ? { ...current, encryption_ready: true } : current);
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
      if (settings.daily_reminder_enabled && notificationPermission === "default") {
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
          </div>
        </div>

      </section>
    </PortalShell>
  );
}
