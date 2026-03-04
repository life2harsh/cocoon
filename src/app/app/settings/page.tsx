"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StreakBadge } from "@/components/StreakBadge";
import ThemeToggle from "@/components/ThemeToggle";

export default function SettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setAiEnabled(data.ai_enabled ?? true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggleAi(enabled: boolean) {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_enabled: enabled }),
    });
    setAiEnabled(enabled);
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 animate-rise motion-reduce:animate-none">
      <Link
        href="/app"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink-soft transition-colors hover:text-foreground"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to notebooks
      </Link>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground font-[family:var(--font-display)]">
        Settings
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Personalize how Cocoon feels for you.
      </p>

      <div className="mt-10 space-y-5">
        <section className="rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-foreground">Daily Prompts</h2>
              </div>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                Gentle AI-powered questions to help you reflect. One per day, tailored to your journal style.
              </p>
            </div>
            <button
              onClick={() => toggleAi(!aiEnabled)}
              disabled={saving || loading}
              className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
                aiEnabled ? "bg-accent" : "bg-ink/40"
              } ${saving || loading ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  aiEnabled ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Theme</h2>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed mb-4">
            Choose a color palette that feels right.
          </p>
          <ThemeToggle inline />
        </section>

        <section className="rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
              <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Your Journey</h2>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed mb-4">
            Every entry counts. No pressure, no shame.
          </p>
          <StreakBadge />
        </section>

        <section className="rounded-3xl bg-card/60 p-6 ring-1 ring-stroke">
          <p className="text-sm text-ink-muted">
            Cocoon Journal
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            v0.1.0 — Built with care for gentle minds.
          </p>
        </section>
      </div>
    </main>
  );
}
