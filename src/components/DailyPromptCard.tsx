"use client";

import { useState, useEffect, useRef } from "react";
import { encryptEntry, decryptEntry } from "@/lib/e2e";

interface Props {
  journalId: string;
}

export function DailyPromptCard({ journalId }: Props) {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [existingReply, setExistingReply] = useState<{ body: string; created_at: string; author: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const canReply = Boolean(question && questionId && !existingReply);

  useEffect(() => {
    const fetchDaily = async () => {
      const url = new URL("/api/prompts/daily", window.location.origin);
      url.searchParams.set("journal_id", journalId);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok && res.status === 400) {
        const pathRes = await fetch(`/api/prompts/daily/by-id/${journalId}`, { cache: "no-store" });
        if (pathRes.ok) {
          return pathRes.json();
        }
        const retry = await fetch(url.toString(), {
          cache: "no-store",
          headers: { "x-journal-id": journalId },
        });
        if (!retry.ok) {
          throw new Error("daily_prompt_failed");
        }
        return retry.json();
      }
      if (!res.ok) {
        throw new Error("daily_prompt_failed");
      }
      return res.json();
    };

    fetchDaily()
      .then((data) => {
        if (data.question) {
          setQuestion(data.question);
          setQuestionId(data.id || null);
        } else {
          setQuestion(null);
          setQuestionId(data.id || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [journalId]);

  useEffect(() => {
    if (questionId) {
      const parts = questionId.split(":");
      const promptId = parts.length > 1 ? parts[0] : questionId;
      fetch(`/api/prompts/daily/reply?prompt_id=${promptId}`)
        .then((res) => res.json())
        .then(async (data) => {
          if (data.encrypted_body && data.nonce) {
            const decrypted = await decryptEntry(journalId, data.encrypted_body, data.nonce);
            if (decrypted) {
              setExistingReply({
                body: decrypted,
                created_at: data.created_at,
                author: data.author || "You",
              });
              return;
            }
          }
          if (data.body) {
            setExistingReply({
              body: data.body,
              created_at: data.created_at,
              author: data.author || "You",
            });
          }
        })
        .catch(() => {});
    }
  }, [questionId, journalId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSubmitReply() {
    if (!replyText.trim() || submitting) return;
    if (!questionId) {
      setNotice("Prompt unavailable. Refresh to try again.");
      return;
    }
    setSubmitting(true);
    try {
      const encrypted = await encryptEntry(journalId, replyText.trim());
      const res = await fetch(`/api/journals/${journalId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyText.trim(),
          prompt_id: questionId?.split(":")[0] || null,
          encrypted_body: encrypted?.cipher || null,
          nonce: encrypted?.iv || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("Failed to submit reply:", err);
        setNotice("Failed to save reply. Please try again.");
        return;
      }
      setExistingReply({
        body: replyText.trim(),
        created_at: new Date().toISOString(),
        author: "You",
      });
      setReplyText("");
      setReplying(false);
    } catch (err) {
      console.error("Error submitting reply:", err);
      setNotice("Failed to save reply. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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

  if (!question && !existingReply) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-card to-accent/5 p-5 ring-1 ring-stroke/50 shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-xs font-medium text-accent uppercase tracking-wide">
            Question of the day
          </span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-full hover:bg-ink/10 transition-colors"
          >
            <svg className="w-4 h-4 text-ink-soft" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 rounded-xl bg-card-strong ring-1 ring-stroke shadow-lg overflow-hidden z-10">
              {canReply && (
                <button
                  onClick={() => { setReplying(true); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-ink/10 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Reply
                </button>
              )}
              <button
                onClick={() => setShowMenu(false)}
                className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-ink/10 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
      {question ? (
        <p className="text-lg font-medium text-foreground leading-relaxed">
          {question}
        </p>
      ) : (
        <p className="text-sm text-ink-soft">Question hidden</p>
      )}
      {notice && (
        <div className="mt-3 rounded-xl bg-ink/10 px-4 py-3 text-xs text-ink-soft">
          {notice}
        </div>
      )}

      {existingReply ? (
        <div className="mt-4 pt-4 border-t border-stroke/50">
          <p className="text-xs text-ink-soft mb-2">Your reply:</p>
          <div className="rounded-xl bg-accent/10 p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{existingReply.body}</p>
            <p className="text-xs text-ink-soft mt-2">
              {new Date(existingReply.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ) : replying ? (
        <div className="mt-4">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your thoughts..."
            className="w-full h-32 resize-none rounded-xl bg-input p-3 text-sm text-foreground placeholder:text-ink-soft ring-1 ring-input-border focus:outline-none focus:ring-2 focus:ring-accent/40"
            autoFocus
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSubmitReply}
              disabled={submitting || !replyText.trim()}
              className="px-4 py-2 rounded-full bg-accent text-xs font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send"}
            </button>
            <button
              onClick={() => { setReplying(false); setReplyText(""); }}
              className="px-4 py-2 rounded-full bg-ink/10 text-xs font-semibold text-foreground transition hover:bg-ink/20"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
