const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_WITH_OFFSET_RE = /(?:Z|[+-]\d{2}:\d{2})$/i;
const LOCAL_API_HOSTS = new Set(["localhost", "127.0.0.1"]);

function resolveApiBase(): string {
  return import.meta.env.VITE_API_URL || "/api";
}

function resolveConfiguredApiTimezone(): "utc" | "local" | null {
  const rawValue = import.meta.env.VITE_API_TIMEZONE?.trim().toLowerCase();
  if (rawValue === "utc" || rawValue === "local") {
    return rawValue;
  }
  return null;
}

function resolveApiHostname(): string | null {
  try {
    const fallbackOrigin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    return new URL(resolveApiBase(), fallbackOrigin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function shouldTreatNaiveBackendDateTimesAsUtc(): boolean {
  const configuredTimezone = resolveConfiguredApiTimezone();
  if (configuredTimezone) {
    return configuredTimezone === "utc";
  }

  const hostname = resolveApiHostname();
  if (!hostname) {
    return false;
  }

  return !LOCAL_API_HOSTS.has(hostname);
}

export function parseBackendDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (DATE_ONLY_RE.test(normalized)) {
    const [year, month, day] = normalized.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const candidate =
    normalized.includes("T") && !DATE_TIME_WITH_OFFSET_RE.test(normalized) && shouldTreatNaiveBackendDateTimesAsUtc()
      ? `${normalized}Z`
      : normalized;

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getBackendTimestamp(value: string | null | undefined): number {
  return parseBackendDate(value)?.getTime() ?? 0;
}

export function formatBackendDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric", year: "numeric" },
): string {
  const parsed = parseBackendDate(value);
  if (!parsed) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, options).format(parsed);
}

export function formatBackendTime(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
): string {
  const parsed = parseBackendDate(value);
  if (!parsed) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, options).format(parsed);
}
