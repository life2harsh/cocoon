import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";
type ThemeAppearance = "morning" | "sage" | "lavender" | "peach";

type ThemeState = {
  mode: ThemeMode;
  appearance: ThemeAppearance;
};

const MODES: { id: ThemeMode; name: string; swatch: string }[] = [
  { id: "light", name: "Light", swatch: "#4a6176" },
  { id: "dark", name: "Dark", swatch: "#8fb9ff" },
];

const APPEARANCES: { id: ThemeAppearance; name: string; swatch: string }[] = [
  { id: "morning", name: "Morning", swatch: "#4a6176" },
  { id: "sage", name: "Sage", swatch: "#59705b" },
  { id: "lavender", name: "Lavender", swatch: "#74668c" },
  { id: "peach", name: "Peach", swatch: "#9f6d57" },
];

const STORAGE_KEY = "cocoon-theme";

function applyTheme(theme: ThemeState) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme.mode);
  if (theme.appearance === "morning") {
    document.documentElement.removeAttribute("data-appearance");
  } else {
    document.documentElement.setAttribute("data-appearance", theme.appearance);
  }
}

function isAppearance(value: string): value is ThemeAppearance {
  return APPEARANCES.some((appearance) => appearance.id === value);
}

function resolveInitialTheme(): ThemeState {
  if (typeof window === "undefined") {
    return { mode: "light", appearance: "morning" };
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const fallback: ThemeState = { mode: prefersDark ? "dark" : "light", appearance: "morning" };

  if (!stored) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<ThemeState>;
    if ((parsed.mode === "light" || parsed.mode === "dark") && parsed.appearance && isAppearance(parsed.appearance)) {
      return { mode: parsed.mode, appearance: parsed.appearance };
    }
  } catch {
    if (stored === "light" || stored === "dark") {
      return { mode: stored, appearance: "morning" };
    }
    if (isAppearance(stored)) {
      return { mode: "light", appearance: stored };
    }
  }

  return fallback;
}

export default function ThemeToggle({ inline }: { inline?: boolean }) {
  const [theme, setTheme] = useState<ThemeState>(resolveInitialTheme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined" || !open || inline) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [inline, open]);

  function selectMode(mode: ThemeMode) {
    const next = { ...theme, mode };
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    setOpen(false);
  }

  function selectAppearance(appearance: ThemeAppearance) {
    const next = { ...theme, appearance };
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }

  if (inline) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">Theme</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MODES.map((modeOption) => {
              const active = theme.mode === modeOption.id;
              return (
                <button
                  key={modeOption.id}
                  type="button"
                  onClick={() => selectMode(modeOption.id)}
                  className={`flex items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-sm ${
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-stroke bg-card-muted text-foreground-soft hover:text-foreground"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: modeOption.swatch }} />
                  <span className="font-semibold">{modeOption.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">Appearance</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {APPEARANCES.map((appearance) => {
              const active = theme.appearance === appearance.id;
              return (
                <button
                  key={appearance.id}
                  type="button"
                  onClick={() => selectAppearance(appearance.id)}
                  className={`flex items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-sm ${
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-stroke bg-card-muted text-foreground-soft hover:text-foreground"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: appearance.swatch }} />
                  <span className="font-semibold">{appearance.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const currentMode = MODES.find((modeOption) => modeOption.id === theme.mode) || MODES[0];
  const currentAppearance = APPEARANCES.find((appearance) => appearance.id === theme.appearance) || APPEARANCES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="cocoon-glass-subtle flex h-10 w-10 items-center justify-center rounded-full border border-stroke shadow-[0_10px_24px_var(--shadow-soft)] sm:h-11 sm:w-11"
        aria-label={`Change theme, current mode ${currentMode.name}, appearance ${currentAppearance.name}`}
      >
        <span className="h-4.5 w-4.5 rounded-full sm:h-5 sm:w-5" style={{ backgroundColor: currentMode.swatch }} />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40 bg-[color:var(--overlay)]/70 sm:bg-transparent" onClick={() => setOpen(false)} />
          <div className="cocoon-popover fixed inset-x-4 top-20 z-50 max-h-[calc(100dvh-6.5rem)] overflow-y-auto rounded-[1.5rem] p-2 sm:absolute sm:right-0 sm:top-14 sm:w-52 sm:max-h-none sm:overflow-visible">
            <div className="flex items-center justify-between px-3 py-2 sm:block sm:px-0 sm:py-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted sm:px-3 sm:py-2">Theme</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-foreground-soft sm:hidden"
              >
                Close
              </button>
            </div>
            {MODES.map((modeOption) => (
              <button
                key={modeOption.id}
                type="button"
                onClick={() => selectMode(modeOption.id)}
                className={`flex w-full items-center gap-3 rounded-[1rem] px-3 py-2 text-sm ${
                  theme.mode === modeOption.id ? "bg-primary-soft text-primary" : "text-foreground-soft hover:bg-card-muted hover:text-foreground"
                }`}
              >
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: modeOption.swatch }} />
                <span className="font-semibold">{modeOption.name}</span>
              </button>
            ))}
            <p className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">Appearance</p>
            {APPEARANCES.map((appearance) => (
              <button
                key={appearance.id}
                type="button"
                onClick={() => selectAppearance(appearance.id)}
                className={`flex w-full items-center gap-3 rounded-[1rem] px-3 py-2 text-sm ${
                  theme.appearance === appearance.id ? "bg-primary-soft text-primary" : "text-foreground-soft hover:bg-card-muted hover:text-foreground"
                }`}
              >
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: appearance.swatch }} />
                <span className="font-semibold">{appearance.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
