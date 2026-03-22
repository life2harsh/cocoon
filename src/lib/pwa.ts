import type { PushSubscriptionPayload } from "@/lib/api";

export async function registerPwaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.error("Service worker registration failed", error);
    return null;
  }
}

export async function showAppNotification(
  title: string,
  options: NotificationOptions & { data?: { url?: string } } = {},
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    } catch {
      // Fall through to the window Notification constructor.
    }
  }

  new Notification(title, options);
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function ensurePushSubscription(vapidPublicKey: string): Promise<PushSubscriptionPayload | null> {
  const registration = await getPushRegistration(true);
  if (!registration || !isPushSupported()) {
    return null;
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey) as BufferSource,
    });
  }

  return serializePushSubscription(subscription);
}

export async function getExistingPushSubscription(): Promise<PushSubscriptionPayload | null> {
  const registration = await getPushRegistration(false);
  if (!registration || !isPushSupported()) {
    return null;
  }

  const subscription = await registration.pushManager.getSubscription();
  return subscription ? serializePushSubscription(subscription) : null;
}

export async function unsubscribePushSubscription(): Promise<string | null> {
  const registration = await getPushRegistration(false);
  if (!registration || !isPushSupported()) {
    return null;
  }

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return null;
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}

async function getPushRegistration(registerIfMissing: boolean): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    return existing;
  }

  if (!registerIfMissing) {
    return null;
  }

  return registerPwaServiceWorker();
}

function serializePushSubscription(subscription: PushSubscription): PushSubscriptionPayload | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }

  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const padded = `${value}${"=".repeat((4 - (value.length % 4 || 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const decoded = window.atob(padded);
  const output = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    output[index] = decoded.charCodeAt(index);
  }

  return output;
}
