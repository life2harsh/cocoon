"use client";

import { useState, useEffect } from "react";

type ThemeMode = "dark" | "light" | "ocean" | "lavender" | "sage" | "peach";

const THEMES: { id: ThemeMode; name: string; swatch: string }[] = [
  { id: "ocean", name: "Ocean", swatch: "#4a8a98" },
  { id: "lavender", name: "Lavender", swatch: "#9a7aa8" },
  { id: "sage", name: "Sage", swatch: "#6a8a5a" },
  { id: "peach", name: "Peach", swatch: "#c89a7a" },
  { id: "dark", name: "Midnight", swatch: "#3a4a58" },
  { id: "light", name: "Dawn", swatch: "#e8d8c0" },
];

const STORAGE_KEY = "cocoon-theme";

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute("data-theme");
  if (mode !== "ocean") {
    document.documentElement.setAttribute("data-theme", mode);
  }
}

function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "ocean";
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (stored && THEMES.some((t) => t.id === stored)) return stored;
  return "ocean";
}

export default function ThemeToggle({ inline }: { inline?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>(resolveInitialTheme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  function selectTheme(theme: ThemeMode) {
    setMode(theme);
    applyTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
    setOpen(false);
  }

  if (inline) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((theme) => {
          const active = mode === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme.id)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                active
                  ? "bg-accent/20 ring-2 ring-accent text-foreground"
                  : "bg-ink/10 ring-1 ring-stroke text-ink-muted hover:bg-ink/20 hover:text-foreground"
              }`}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: theme.swatch }}
              />
              <span className="text-xs font-medium">{theme.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const currentTheme = THEMES.find((t) => t.id === mode) || THEMES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card ring-1 ring-stroke shadow-[0_10px_26px_var(--shadow)] transition hover:-translate-y-0.5 hover:bg-card-strong"
        aria-label="Change theme"
      >
        <span
          className="h-5 w-5 rounded-full ring-1 ring-white/20"
          style={{ backgroundColor: currentTheme.swatch }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl bg-card-strong p-2 ring-1 ring-stroke shadow-xl animate-rise">
            <p className="px-3 py-2 text-xs font-medium text-ink-soft uppercase tracking-wide">
              Choose theme
            </p>
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => selectTheme(theme.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  mode === theme.id
                    ? "bg-accent/20 text-foreground"
                    : "text-ink-muted hover:bg-ink/20 hover:text-foreground"
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: theme.swatch }}
                />
                {theme.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
