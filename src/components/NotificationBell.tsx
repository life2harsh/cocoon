import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Glyph } from "@/components/Glyph";
import { api, type AppSettings, type NotificationItem } from "@/lib/api";
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  SETTINGS_UPDATED_EVENT,
} from "@/lib/notifications";

const POLL_INTERVAL_MS = 30000;

type UserSummary = {
  id?: string | null;
};

function formatRelativeTime(value: string): string {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export function NotificationBell({ user }: { user?: UserSummary | null }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(getBrowserNotificationPermission());
  const navigate = useNavigate();

  useEffect(() => {
    function handleSettingsUpdated(event: Event) {
      setSettings((event as CustomEvent<AppSettings>).detail);
    }

    if (typeof window !== "undefined") {
      window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      try {
        const [feed, nextSettings] = await Promise.all([
          api.notifications.list({ limit: 20 }),
          api.settings.get(),
        ]);
        if (cancelled) {
          return;
        }

        setItems(feed.items);
        setUnreadCount(feed.unread_count);
        setSettings(nextSettings);
      } catch {
        // Keep the shell usable even if notifications fail.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setPermission(getBrowserNotificationPermission());
        void loadNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id]);

  async function handleEnableBrowserAlerts() {
    const nextPermission = await requestBrowserNotificationPermission();
    setPermission(nextPermission);
  }

  async function handleOpenNotification(item: NotificationItem) {
    if (!item.read_at) {
      await api.notifications.read(item.id);
      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id ? { ...notification, read_at: new Date().toISOString() } : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    setOpen(false);
    navigate(item.target_url || (item.journal_id ? `/app/journals/${item.journal_id}` : "/app"));
  }

  async function handleReadAll() {
    await api.notifications.readAll();
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
    setUnreadCount(0);
  }

  if (!user?.id) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="cocoon-glass-subtle relative flex h-10 w-10 items-center justify-center rounded-full border border-stroke text-foreground-muted shadow-[0_10px_24px_var(--shadow-soft)] sm:h-11 sm:w-11"
        aria-label="Notifications"
      >
        <Glyph name="bell" className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="cocoon-popover fixed right-4 top-24 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-[1.5rem] p-3 md:absolute md:right-0 md:top-14">
            <div className="flex items-center justify-between gap-3 px-2 pb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">Notifications</p>
                <p className="mt-1 text-sm text-foreground-soft">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleReadAll()}
                disabled={unreadCount === 0}
                className="text-xs font-semibold text-foreground-soft disabled:opacity-40"
              >
                Mark all read
              </button>
            </div>

            {permission === "default" && settings?.notifications_enabled ? (
              <button
                type="button"
                onClick={() => void handleEnableBrowserAlerts()}
                className="mb-3 flex w-full items-center justify-between rounded-[1rem] border border-stroke bg-card-muted px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Enable browser alerts</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-soft">Allow Cocoon to send browser notifications on this device.</p>
                </div>
                <Glyph name="arrow-right" className="h-4 w-4 text-foreground-muted" />
              </button>
            ) : null}

            {permission === "denied" ? (
              <div className="mb-3 rounded-[1rem] border border-stroke bg-card-muted px-4 py-3 text-xs leading-5 text-foreground-soft">
                Browser notifications are blocked for Cocoon in this browser.
              </div>
            ) : null}

            <div className="max-h-[22rem] space-y-2 overflow-y-auto cocoon-scroll pr-1">
              {loading ? (
                <div className="rounded-[1rem] border border-stroke bg-card-muted px-4 py-5 text-sm text-foreground-soft">
                  Loading notifications...
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-[1rem] border border-stroke bg-card-muted px-4 py-5 text-sm text-foreground-soft">
                  New activity across your journals will appear here.
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleOpenNotification(item)}
                    className={`flex w-full items-start gap-3 rounded-[1rem] border px-4 py-3 text-left ${
                      item.read_at ? "border-stroke bg-[color:var(--glass-subtle)]" : "border-stroke-strong bg-card-muted"
                    }`}
                  >
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                      {item.actor?.avatar_url ? (
                        <img
                          src={item.actor.avatar_url}
                          alt={item.actor.display_name || "Notifier avatar"}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <Glyph name="bell" className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        {!item.read_at ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-foreground-soft">{item.body}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-foreground-muted">
                        {item.journal_name || "Cocoon"} · {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
