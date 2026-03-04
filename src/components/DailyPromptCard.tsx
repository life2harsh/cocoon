"use client";

import { useState, useEffect } from "react";

interface Props {
  journalId: string;
}

export function DailyPromptCard({ journalId }: Props) {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/prompts/daily?journal_id=${journalId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.question) setQuestion(data.question);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [journalId]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-5 ring-1 ring-stroke animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 rounded bg-ink-soft/30" />
          <div className="h-4 w-28 rounded bg-ink-soft/30" />
        </div>
        <div className="h-6 rounded bg-ink-soft/20" />
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-card to-accent/5 p-5 ring-1 ring-stroke/50 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-xs font-medium text-accent uppercase tracking-wide">
          Today&apos;s Prompt
        </span>
      </div>
      <p className="text-lg font-medium text-foreground leading-relaxed">
        {question}
      </p>
    </div>
  );
}
