"use client";

import { useState } from "react";

interface Props {
  onSelect: (template: string) => void;
  onClose: () => void;
}

const TEMPLATES = [
  {
    id: "couple",
    name: "Couple",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    description: "Shared journal for you and your partner.",
    featured: true,
  },
  {
    id: "free_write",
    name: "Free Write",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    description: "Blank canvas. Whatever's on your mind.",
  },
  {
    id: "gratitude",
    name: "Gratitude",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    description: "Focus on the good things in life.",
  },
  {
    id: "reflection",
    name: "Reflection",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    description: "Look back on your day with kindness.",
  },
  {
    id: "structured",
    name: "Structured",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    description: "Simple prompts asking for 3 things.",
  },
  {
    id: "cbt",
    name: "CBT",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    description: "Challenge thoughts, reframe kindly.",
  },
  {
    id: "habit",
    name: "Habit",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: "Track habits and daily progress.",
  },
];

export function JournalTemplatePicker({ onSelect, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-card-strong rounded-3xl ring-1 ring-stroke shadow-2xl animate-rise overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground font-[family:var(--font-display)]">
              Pick a style
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Sets the vibe for your prompts. You can change it later.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-full hover:bg-ink/20 transition-colors"
          >
            <svg className="w-5 h-5 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-2 flex flex-col gap-2.5 max-h-[52vh] overflow-y-auto">
          {TEMPLATES.filter((t) => t.featured).map((t) => {
            const active = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`group relative flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 ${
                  active
                    ? "bg-accent/20 ring-2 ring-accent shadow-[0_0_20px_var(--glow)]"
                    : "bg-gradient-to-r from-accent/10 to-accent/5 ring-1 ring-accent/30 hover:ring-accent/50 hover:from-accent/15 hover:to-accent/10"
                }`}
              >
                <div className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-xl transition-colors duration-200 ${active ? "bg-accent/30 text-accent" : "bg-accent/15 text-accent/70 group-hover:text-accent"}`}>
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm transition-colors duration-200 ${active ? "text-foreground" : "text-foreground/80"}`}>
                    {t.name}
                  </div>
                  <div className="text-xs text-ink-soft mt-0.5 leading-snug">
                    {t.description}
                  </div>
                </div>
                {active && (
                  <div className="shrink-0">
                    <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
          <div className="grid grid-cols-2 gap-2.5">
            {TEMPLATES.filter((t) => !t.featured).map((t) => {
              const active = selected === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={`group relative p-4 rounded-2xl text-left transition-all duration-200 ${
                    active
                      ? "bg-accent/20 ring-2 ring-accent shadow-[0_0_20px_var(--glow)]"
                      : "bg-ink/10 ring-1 ring-stroke hover:bg-ink/20 hover:ring-accent/40"
                  }`}
                >
                  <div className={`mb-2.5 transition-colors duration-200 ${active ? "text-accent" : "text-ink-muted group-hover:text-foreground"}`}>
                    {t.icon}
                  </div>
                  <div className={`font-semibold text-sm transition-colors duration-200 ${active ? "text-foreground" : "text-foreground/80"}`}>
                    {t.name}
                  </div>
                  <div className="text-xs text-ink-soft mt-1 leading-snug">
                    {t.description}
                  </div>
                  {active && (
                    <div className="absolute top-3 right-3">
                      <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 pt-4 flex gap-3">
          <button
            onClick={() => onSelect("free_write")}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-ink-muted bg-ink/10 ring-1 ring-stroke transition-all hover:bg-ink/20 hover:text-foreground"
          >
            Skip
          </button>
          <button
            onClick={() => onSelect(selected || "free_write")}
            disabled={!selected}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-accent text-white shadow-[0_8px_24px_var(--glow)] hover:bg-accent-strong hover:-translate-y-0.5"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
