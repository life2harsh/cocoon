"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function StreakBadge() {
  const [streak, setStreak] = useState({ current: 0, longest: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStreak() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const res = await fetch("/api/streaks");
        const data = await res.json();
        setStreak({
          current: data.current_streak || 0,
          longest: data.longest_streak || 0,
          total: data.total_entries || 0,
        });
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchStreak();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card ring-1 ring-stroke">
        <div className="w-5 h-5 rounded-full bg-ink-soft/30 animate-pulse" />
        <div className="h-4 w-12 rounded bg-ink-soft/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-ocean-soft/20 to-sage/20 ring-1 ring-ocean-soft/30">
      <div className="relative">
        <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
        </svg>
        {streak.current > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse" />
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">
          {streak.current} day{streak.current !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-ink-soft">
          {streak.total} total
        </span>
      </div>
    </div>
  );
}