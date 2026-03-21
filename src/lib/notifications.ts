import type { AppSettings } from "@/lib/api";

export const SETTINGS_UPDATED_EVENT = "cocoon:settings-updated";
const DEFAULT_REMINDER_COUNT = 1;
const MAX_REMINDER_COUNT = 3;

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

type QuietHoursSettings = Pick<
  AppSettings,
  "quiet_hours_enabled" | "quiet_hours_start" | "quiet_hours_end"
>;

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.requestPermission();
}

export function normalizeReminderCount(value: number | null | undefined): number {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_REMINDER_COUNT;
  }
  return Math.min(MAX_REMINDER_COUNT, Math.max(DEFAULT_REMINDER_COUNT, Math.round(value)));
}

export function isQuietHoursActive(settings: QuietHoursSettings | null, at = new Date()): boolean {
  if (!settings?.quiet_hours_enabled) {
    return false;
  }

  const start = timeToMinutes(settings.quiet_hours_start);
  const end = timeToMinutes(settings.quiet_hours_end);
  const current = at.getHours() * 60 + at.getMinutes();

  if (start === end) {
    return true;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

export function shiftOutsideQuietHours(settings: QuietHoursSettings | null, at: Date): Date {
  if (!settings?.quiet_hours_enabled) {
    return new Date(at);
  }

  if (settings.quiet_hours_start === settings.quiet_hours_end) {
    return new Date(at);
  }

  let next = new Date(at);
  next.setSeconds(0, 0);

  while (isQuietHoursActive(settings, next)) {
    const [endHour, endMinute] = settings.quiet_hours_end.split(":").map(Number);
    const resumedAt = new Date(next);
    resumedAt.setHours(endHour, endMinute, 0, 0);
    if (resumedAt <= next) {
      resumedAt.setDate(resumedAt.getDate() + 1);
    }
    next = resumedAt;
  }

  return next;
}

export function dispatchSettingsUpdated(settings: AppSettings) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent<AppSettings>(SETTINGS_UPDATED_EVENT, { detail: settings }));
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
