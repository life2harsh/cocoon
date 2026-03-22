import { useCallback, useEffect, useState } from "react";
import { api, type AppSettings } from "@/lib/api";
import {
  getBrowserNotificationPermission,
  SETTINGS_UPDATED_EVENT,
} from "@/lib/notifications";
import {
  ensurePushSubscription,
  getExistingPushSubscription,
  isPushSupported,
  unsubscribePushSubscription,
} from "@/lib/pwa";

export function PushSubscriptionManager({ userId }: { userId?: string | null }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const loadSettings = useCallback(async (): Promise<AppSettings | null> => {
    if (!userId) {
      return null;
    }

    try {
      const nextSettings = await api.settings.get();
      setSettings(nextSettings);
      return nextSettings;
    } catch {
      return null;
    }
  }, [userId]);

  const syncPushSubscription = useCallback(
    async (nextSettings?: AppSettings | null) => {
      if (!userId || !isPushSupported()) {
        return;
      }

      const effectiveSettings = nextSettings ?? settings ?? (await loadSettings());
      if (!effectiveSettings) {
        return;
      }

      if (
        !effectiveSettings.notifications_enabled ||
        getBrowserNotificationPermission() !== "granted"
      ) {
        const existingSubscription = await getExistingPushSubscription();
        if (!existingSubscription?.endpoint) {
          return;
        }

        try {
          await api.push.unsubscribe(existingSubscription.endpoint);
        } catch {
          // Best effort only. The local unsubscribe still prevents future pushes here.
        }

        try {
          await unsubscribePushSubscription();
        } catch {
          // Ignore client unsubscribe errors so the app stays usable.
        }
        return;
      }

      try {
        const config = await api.push.publicKey();
        if (!config.enabled || !config.public_key) {
          return;
        }

        const subscription = await ensurePushSubscription(config.public_key);
        if (!subscription) {
          return;
        }

        await api.push.subscribe(subscription);
      } catch {
        // Keep push sync silent if the browser or network temporarily refuses it.
      }
    },
    [loadSettings, settings, userId],
  );

  useEffect(() => {
    if (!userId) {
      setSettings(null);
      return;
    }

    void loadSettings();
  }, [loadSettings, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void syncPushSubscription();
  }, [syncPushSubscription, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      return;
    }

    function handleSettingsUpdated(event: Event) {
      const nextSettings = (event as CustomEvent<AppSettings>).detail;
      setSettings(nextSettings);
      void syncPushSubscription(nextSettings);
    }

    function handleVisibilityOrFocus() {
      if (document.visibilityState === "visible") {
        void loadSettings().then((nextSettings) => syncPushSubscription(nextSettings));
      }
    }

    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [loadSettings, syncPushSubscription, userId]);

  return null;
}
