"use client";

import { useState, useEffect, useRef } from "react";

export function StreakBadge() {
  const [streak, setStreak] = useState({ current: 0, longest: 0, total: 0, entry_dates: [] as string[] });
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchStreak() {
      try {
        const res = await fetch("/api/streaks");
        const data = await res.json();
        setStreak({
          current: data.current_streak || 0,
          longest: data.longest_streak || 0,
          total: data.total_entries || 0,
          entry_dates: data.entry_dates || [],
        });
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchStreak();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function getCalendarDays() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.unshift({ date: new Date(year, month, -i), isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }

  const calendarDays = getCalendarDays();
  const entryDateSet = new Set(streak.entry_dates);

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card ring-1 ring-stroke">
        <div className="w-5 h-5 rounded-full bg-ink-soft/30 animate-pulse" />
        <div className="h-4 w-12 rounded bg-ink-soft/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative" ref={calendarRef}>
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-ocean-soft/20 to-sage/20 ring-1 ring-ocean-soft/30 hover:from-ocean-soft/30 hover:to-sage/30 transition-all"
      >
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
      </button>

      {showCalendar && (
        <div className="absolute left-0 mt-3 w-72 rounded-2xl bg-card-strong ring-1 ring-stroke shadow-xl z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowCalendar(false)}
              className="text-xs font-semibold text-foreground"
            >
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="text-xs text-ink-soft">{d}</span>
            ))}
            {calendarDays.map((day, i) => {
              const dateStr = day.date.toISOString().split("T")[0];
              const hasEntry = entryDateSet.has(dateStr);
              const isToday = day.date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={i}
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs ${
                    !day.isCurrentMonth ? "text-ink-soft/30" :
                    hasEntry ? "bg-accent text-white" :
                    isToday ? "ring-1 ring-accent text-foreground" :
                    "text-foreground"
                  }`}
                >
                  {day.date.getDate()}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-stroke flex justify-between text-xs text-ink-soft">
            <span>Best: {streak.longest} days</span>
            <span>{streak.total} total entries</span>
          </div>
        </div>
      )}
    </div>
  );
}
