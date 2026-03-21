import { useCallback, useEffect, useRef, useState } from "react";
import { api, type AppSettings } from "@/lib/api";
import {
  getBrowserNotificationPermission,
  normalizeReminderCount,
  SETTINGS_UPDATED_EVENT,
  shiftOutsideQuietHours,
} from "@/lib/notifications";
import { showAppNotification } from "@/lib/pwa";

const FOLLOW_UP_INTERVAL_MS = 90 * 60 * 1000;
const PERMISSION_RETRY_MS = 15 * 60 * 1000;
const IDLE_RETRY_MS = 60 * 60 * 1000;
const DELIVERED_PREFIX = "cocoon_daily_reminder_seen";

type ReminderTarget = {
  key: string;
  slotIndex: number;
  when: Date;
};

export function ReminderScheduler({ userId }: { userId?: string | null }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const loadSettings = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const nextSettings = await api.settings.get();
      setSettings(nextSettings);
    } catch {
      // Keep the scheduler quiet if settings are temporarily unavailable.
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;
    api.settings
      .get()
      .then((nextSettings) => {
        if (!cancelled) {
          setSettings(nextSettings);
        }
      })
      .catch(() => {
        // Keep the scheduler quiet if settings are temporarily unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function scheduleNextReminder() {
      clearTimer();

      if (cancelled || !userId || !settings?.daily_reminder_enabled) {
        return;
      }

      if (getBrowserNotificationPermission() !== "granted") {
        timeoutRef.current = window.setTimeout(() => {
          if (!cancelled) {
            void scheduleNextReminder();
          }
        }, PERMISSION_RETRY_MS);
        return;
      }

      const nextTarget = getNextReminderTarget(settings, userId, new Date());
      if (!nextTarget) {
        timeoutRef.current = window.setTimeout(() => {
          if (!cancelled) {
            void scheduleNextReminder();
          }
        }, IDLE_RETRY_MS);
        return;
      }

      const delayMs = Math.max(0, nextTarget.when.getTime() - Date.now());
      timeoutRef.current = window.setTimeout(() => {
        if (!cancelled) {
          void deliverReminder(nextTarget);
        }
      }, delayMs);
    }

    async function deliverReminder(target: ReminderTarget) {
      if (cancelled || !userId) {
        return;
      }

      const delivered = loadDeliveredTargets(userId);
      if (delivered.has(target.key)) {
        void scheduleNextReminder();
        return;
      }

      if (getBrowserNotificationPermission() !== "granted") {
        timeoutRef.current = window.setTimeout(() => {
          if (!cancelled) {
            void scheduleNextReminder();
          }
        }, PERMISSION_RETRY_MS);
        return;
      }

      await showAppNotification("Daily writing reminder", {
        body:
          target.slotIndex === 0
            ? "Take a quiet minute for today's journal entry."
            : "A gentle nudge if you still want to write today.",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: `daily-reminder-${target.key}`,
        data: { url: "/app" },
      });

      delivered.add(target.key);
      persistDeliveredTargets(userId, delivered);
      void scheduleNextReminder();
    }

    void scheduleNextReminder();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [clearTimer, settings, userId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handleSettingsUpdated(event: Event) {
      setSettings((event as CustomEvent<AppSettings>).detail);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadSettings();
      }
    }

    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadSettings]);

  return null;
}

function getNextReminderTarget(settings: AppSettings, userId: string, now: Date): ReminderTarget | null {
  const delivered = loadDeliveredTargets(userId);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const candidates = [...buildReminderTargets(settings, today), ...buildReminderTargets(settings, tomorrow)]
    .filter((target) => !delivered.has(target.key))
    .sort((left, right) => left.when.getTime() - right.when.getTime());

  return candidates[0] ?? null;
}

function buildReminderTargets(settings: AppSettings, dayStart: Date): ReminderTarget[] {
  const [hour, minute] = settings.daily_reminder_time.split(":").map(Number);
  const firstSlot = new Date(dayStart);
  firstSlot.setHours(hour, minute, 0, 0);

  const targets: ReminderTarget[] = [];
  const reminderCount = normalizeReminderCount(settings.daily_reminder_count);
  let nextTime = shiftOutsideQuietHours(settings, firstSlot);

  for (let index = 0; index < reminderCount; index += 1) {
    if (index > 0) {
      nextTime = shiftOutsideQuietHours(settings, new Date(nextTime.getTime() + FOLLOW_UP_INTERVAL_MS));
    }

    targets.push({
      key: `${nextTime.toISOString()}|${index}`,
      slotIndex: index,
      when: new Date(nextTime),
    });
  }

  return targets;
}

function loadDeliveredTargets(userId: string): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  const stored = window.localStorage.getItem(getDeliveredKey(userId));
  if (!stored) {
    return new Set();
  }

  try {
    return new Set(JSON.parse(stored) as string[]);
  } catch {
    return new Set();
  }
}

function persistDeliveredTargets(userId: string, delivered: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  const pruned = Array.from(delivered)
    .filter((key) => {
      const [timestamp] = key.split("|");
      return Date.now() - new Date(timestamp).getTime() < 7 * 24 * 60 * 60 * 1000;
    })
    .sort();

  window.localStorage.setItem(getDeliveredKey(userId), JSON.stringify(pruned));
}

function getDeliveredKey(userId: string): string {
  return `${DELIVERED_PREFIX}:${userId}`;
}
