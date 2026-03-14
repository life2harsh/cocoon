"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Props {
  journalId: string;
}

export function DailyPromptCard({ journalId }: Props) {
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.prompts.daily()
      .then((data) => setPrompt(data.prompt))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [journalId]);

  async function handleSubmit() {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.entries.create(journalId, { body: replyText.trim() });
      setReplyText("");
      setReplying(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="warm-card p-5 animate-pulse"><div className="h-5 w-32 bg-ink/20 rounded" /></div>;
  }

  if (!prompt) return null;

  return (
    <div className="warm-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-xs font-medium text-accent uppercase tracking-wide">Today's prompt</span>
      </div>
      
      <p className="text-base text-foreground mb-3">{prompt}</p>

      {!replying ? (
        <button onClick={() => setReplying(true)} className="text-xs text-ink-soft hover:text-accent transition-colors">
          Write your thoughts...
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Your response..."
            className="w-full h-24 resize-none rounded-xl bg-input p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={submitting || !replyText.trim()} className="px-4 h-8 rounded-lg bg-accent text-xs text-white">
              {submitting ? "Saving..." : "Save"}
            </button>
            <button onClick={() => { setReplying(false); setReplyText(""); }} className="px-4 h-8 rounded-lg bg-card text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
