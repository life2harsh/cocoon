"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export function StreakBadge() {
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.streaks.get()
      .then((data) => setStreak(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center gap-2 px-4 py-2 rounded-full warm-card"><div className="w-4 h-4 bg-ink/30 rounded animate-pulse" /></div>;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full warm-card">
      <span className="text-lg">🔥</span>
      <span className="text-sm font-medium text-foreground">{streak.current_streak} day{streak.current_streak !== 1 ? "s" : ""}</span>
    </div>
  );
}
