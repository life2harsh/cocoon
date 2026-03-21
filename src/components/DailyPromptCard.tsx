import { useEffect, useState } from "react";
import { Glyph } from "@/components/Glyph";
import { api, type DailyPrompt } from "@/lib/api";

interface Props {
  journalId: string;
  disabledReason?: string | null;
  onSubmit: (payload: { body: string; promptId?: string }) => Promise<void>;
}

export function DailyPromptCard({ journalId, disabledReason, onSubmit }: Props) {
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<DailyPrompt | null>(null);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api.prompts
      .daily(journalId)
      .then((data) => {
        if (!cancelled) {
          setPrompt(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrompt(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [journalId]);

  async function handleSubmit() {
    if (!replyText.trim() || submitting || disabledReason || !prompt?.enabled) return;
    setSubmitting(true);
    try {
      await onSubmit({ body: replyText.trim(), promptId: prompt.id || undefined });
      setReplyText("");
      setReplying(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="h-40 rounded-[1.7rem] border border-stroke bg-card-muted animate-pulse" />;
  }

  if (!prompt?.enabled || !prompt.prompt) return null;

  return (
    <div className="cocoon-prompt-card relative overflow-hidden rounded-[1.85rem] px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="cocoon-glass-subtle flex h-10 w-10 items-center justify-center rounded-2xl text-primary">
            <Glyph name="spark" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Daily Prompt</p>
          </div>
        </div>

        <p className="mt-5 font-display text-[1.55rem] leading-8 text-foreground sm:text-[1.95rem] sm:leading-9">
          {prompt.prompt}
        </p>

        {!replying ? (
          <button
            type="button"
            onClick={() => setReplying(true)}
            disabled={Boolean(disabledReason)}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-55"
          >
            Draft a response
            <Glyph name="arrow-right" className="h-4 w-4" />
          </button>
        ) : (
            <div className="mt-5 space-y-3">
              <textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write into today's prompt..."
                className="cocoon-input min-h-32 resize-none px-4 py-4 text-sm leading-7"
              autoFocus
              disabled={Boolean(disabledReason)}
            />
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !replyText.trim() || Boolean(disabledReason)}
                  className="cocoon-button cocoon-button-primary w-full sm:w-auto"
                >
                  {submitting ? "Posting..." : "Post response"}
                </button>
                <button
                  type="button"
                onClick={() => {
                    setReplying(false);
                    setReplyText("");
                  }}
                  className="cocoon-button cocoon-button-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
        )}

        {disabledReason ? <p className="mt-4 text-sm text-foreground-soft">{disabledReason}</p> : null}
      </div>
    </div>
  );
}
