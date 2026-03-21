import { useEffect, useState } from "react";
import { Glyph } from "@/components/Glyph";
import { api, type Streak } from "@/lib/api";

type HeatmapCell = {
  key: string;
  date: Date;
  count: number;
  inRange: boolean;
  isCurrentMonth: boolean;
};

type HeatmapChartProps = {
  weeks: HeatmapCell[][];
  maxCount: number;
  compact?: boolean;
};

type StreakBadgeProps = {
  variant?: "default" | "rail";
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_COMPACT = ["S", "M", "T", "W", "T", "F", "S"];

export function StreakBadge({ variant = "default" }: StreakBadgeProps) {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    api.streaks
      .get()
      .then((data) => setStreak(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || !showCalendar) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCalendar]);

  if (loading) {
    return <div className="h-56 rounded-[1.75rem] border border-stroke bg-card-muted animate-pulse sm:h-64" />;
  }

  const resolvedStreak = streak ?? {
    current_streak: 0,
    longest_streak: 0,
    last_entry_date: null,
    activity: [],
  };
  const isRail = variant === "rail";
  const previewWeeks = buildHeatmapWeeks(resolvedStreak.activity, 84);
  const fullWeeks = buildHeatmapWeeks(resolvedStreak.activity, 365);
  const monthCells = buildMonthCells(resolvedStreak.activity, new Date());
  const maxCount = Math.max(1, ...resolvedStreak.activity.map((item) => item.count));

  return (
    <>
      <div className={isRail ? "cocoon-card p-5" : "cocoon-card p-4 sm:p-6"}>
        <div className={isRail ? "flex items-start justify-between gap-3" : "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Activity</p>
            <h3 className="mt-2 font-display text-[2rem] leading-none text-foreground sm:text-3xl">Streak</h3>
            <p className="mt-2 text-sm leading-6 text-foreground-soft">
              {resolvedStreak.last_entry_date
                ? `Last entry ${new Date(resolvedStreak.last_entry_date).toLocaleDateString()}.`
                : "Write once to start filling in your rhythm."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCalendar(true)}
            className={`cocoon-glass-subtle inline-flex items-center justify-center gap-2 rounded-full border border-stroke font-semibold text-foreground ${
              isRail ? "shrink-0 px-3.5 py-2 text-xs" : "w-full px-4 py-2.5 text-sm sm:w-auto"
            }`}
          >
            <Glyph name="calendar" className="h-4 w-4" />
            Calendar
          </button>
        </div>

        <div className={`grid gap-3 ${isRail ? "mt-5 grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]" : "mt-5 grid-cols-2 sm:mt-6 sm:gap-4"}`}>
          <div className={`min-w-0 border border-stroke bg-card-muted ${isRail ? "rounded-[1.3rem] px-4 py-4" : "rounded-[1.25rem] px-4 py-4 sm:rounded-[1.4rem]"}`}>
            <div className={isRail ? "flex items-center gap-2" : "flex items-center justify-between gap-3"}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">Current</p>
              <div className={`cocoon-tone-amber flex shrink-0 items-center justify-center rounded-full ${isRail ? "h-7 w-7" : "h-8 w-8 sm:h-10 sm:w-10"}`}>
                <Glyph name="flame" className={isRail ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-4.5 sm:w-4.5"} />
              </div>
            </div>
            {isRail ? (
              <div className="mt-4 flex items-end gap-2">
                <p className="font-display text-[2.3rem] leading-none text-foreground">{resolvedStreak.current_streak}</p>
                <p className="pb-1 text-sm font-medium text-foreground-soft">
                  day{resolvedStreak.current_streak === 1 ? "" : "s"}
                </p>
              </div>
            ) : (
              <p className="mt-4 font-display text-[1.7rem] leading-none text-foreground sm:text-[2.15rem]">
                {resolvedStreak.current_streak} day{resolvedStreak.current_streak === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <div className={`min-w-0 border border-stroke bg-card-muted ${isRail ? "rounded-[1.3rem] px-4 py-4" : "rounded-[1.25rem] px-4 py-4 sm:rounded-[1.4rem]"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">Longest</p>
            {isRail ? (
              <div className="mt-4 flex items-end gap-2">
                <p className="font-display text-[2.1rem] leading-none text-foreground">{resolvedStreak.longest_streak}</p>
                <p className="pb-1 text-sm font-medium text-foreground-soft">
                  day{resolvedStreak.longest_streak === 1 ? "" : "s"}
                </p>
              </div>
            ) : (
              <p className="mt-4 font-display text-[1.7rem] leading-none text-foreground sm:text-[2.15rem]">
                {resolvedStreak.longest_streak} day{resolvedStreak.longest_streak === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>

        <div className={`rounded-[1.3rem] border border-stroke bg-card-muted ${isRail ? "mt-4 px-4 py-4" : "mt-5 px-3.5 py-4 sm:mt-6 sm:rounded-[1.4rem] sm:px-5"}`}>
          <div className={isRail ? "flex items-center justify-between gap-3" : "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">Last 12 weeks</p>
            <div className={`flex items-center uppercase tracking-[0.18em] text-foreground-muted ${isRail ? "gap-1.5 text-[10px]" : "gap-2 text-[11px]"}`}>
              <span>{isRail ? "0" : "Less"}</span>
              <HeatmapLegend compact={isRail} />
              <span>{isRail ? "+" : "More"}</span>
            </div>
          </div>
          <div className={isRail ? "mt-3" : "mt-4"}>
            <HeatmapChart weeks={previewWeeks} maxCount={maxCount} compact />
          </div>
        </div>
      </div>

      {showCalendar ? (
        <div className="fixed inset-0 z-50 sm:p-4">
          <div className="cocoon-overlay absolute inset-0" onClick={() => setShowCalendar(false)} />
          <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden border border-stroke bg-card-solid shadow-[0_24px_72px_var(--shadow)] sm:max-h-[calc(100dvh-2rem)] sm:h-auto sm:rounded-[2rem]">
            <div className="flex flex-col gap-4 border-b border-stroke px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Streak calendar</p>
                <h2 className="mt-2 font-display text-[2rem] leading-tight text-foreground sm:text-3xl">Your writing rhythm</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-soft">
                  Days with at least one entry stay softly highlighted across the last year.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                className="cocoon-glass-subtle inline-flex items-center justify-center rounded-full border border-stroke px-4 py-2 text-sm font-semibold text-foreground"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto cocoon-scroll px-4 py-4 sm:px-7 sm:py-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_18rem]">
                <section className="min-w-0 rounded-[1.35rem] border border-stroke bg-card-muted px-4 py-5 sm:rounded-[1.6rem] sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">Last 365 days</p>
                      <p className="mt-2 text-sm leading-6 text-foreground-soft">
                        Soft intensity reflects how often you wrote on each day.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-foreground-muted">
                      <span>Less</span>
                      <HeatmapLegend />
                      <span>More</span>
                    </div>
                  </div>
                  <div className="mt-5">
                    <HeatmapChart weeks={fullWeeks} maxCount={maxCount} />
                  </div>
                </section>

                <section className="rounded-[1.35rem] border border-stroke bg-card-muted px-4 py-5 sm:rounded-[1.6rem] sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">This month</p>
                      <h3 className="mt-2 font-display text-2xl text-foreground">
                        {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date())}
                      </h3>
                    </div>
                    <div className="rounded-full border border-stroke bg-[color:var(--glass-subtle)] px-3 py-1 text-xs font-semibold text-foreground-soft">
                      {resolvedStreak.current_streak} day streak
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2">
                    {WEEKDAY_LABELS.map((label, index) => (
                      <p
                        key={label}
                        className="text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground-muted sm:text-[10px]"
                      >
                        <span className="sm:hidden">{WEEKDAY_LABELS_COMPACT[index]}</span>
                        <span className="hidden sm:inline">{label}</span>
                      </p>
                    ))}

                    {monthCells.map((cell) => {
                      const intensity = getIntensityLevel(cell.count, maxCount);
                      return (
                        <div
                          key={cell.key}
                          title={formatCellTitle(cell.date, cell.count)}
                          className={`flex aspect-square items-center justify-center rounded-[1rem] border text-xs sm:text-sm ${
                            cell.isCurrentMonth
                              ? "border-stroke text-foreground"
                              : "border-transparent text-foreground-muted/60"
                          }`}
                          style={{
                            backgroundColor: cell.isCurrentMonth ? `var(--heatmap-${intensity})` : "transparent",
                          }}
                        >
                          {cell.date.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function HeatmapLegend({ compact = false }: { compact?: boolean }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className={compact ? "h-3 w-3 rounded-[0.35rem] border border-transparent" : "h-3.5 w-3.5 rounded-[0.45rem] border border-transparent"}
          style={{ backgroundColor: `var(--heatmap-${level})` }}
        />
      ))}
    </>
  );
}

function HeatmapChart({ weeks, maxCount, compact = false }: HeatmapChartProps) {
  const cellSize = compact ? 8 : 9;
  const gap = compact ? 3.5 : 4.5;
  const radius = compact ? 3 : 3.25;
  const width = weeks.length * cellSize + Math.max(0, weeks.length - 1) * gap;
  const height = 7 * cellSize + 6 * gap;

  return (
    <svg
      className="block h-auto w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMinYMin meet"
      role="img"
      aria-label="Streak activity heatmap"
    >
      {weeks.map((week, weekIndex) =>
        week.map((cell, dayIndex) => (
          <rect
            key={cell.key}
            x={weekIndex * (cellSize + gap)}
            y={dayIndex * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            rx={radius}
            fill={cell.inRange ? `var(--heatmap-${getIntensityLevel(cell.count, maxCount)})` : "transparent"}
            opacity={cell.inRange ? 1 : 0}
          >
            {cell.inRange ? <title>{formatCellTitle(cell.date, cell.count)}</title> : null}
          </rect>
        )),
      )}
    </svg>
  );
}

function buildHeatmapWeeks(activity: Streak["activity"], visibleDays: number): HeatmapCell[][] {
  const activityMap = new Map(activity.map((item) => [item.date, item.count]));
  const today = startOfDay(new Date());
  const rangeStart = startOfDay(addDays(today, -(visibleDays - 1)));
  const calendarStart = startOfWeek(rangeStart);
  const weeks: HeatmapCell[][] = [];

  let cursor = new Date(calendarStart);
  while (cursor <= today) {
    const week: HeatmapCell[] = [];

    for (let index = 0; index < 7; index += 1) {
      const key = toDateKey(cursor);
      week.push({
        key,
        date: new Date(cursor),
        count: activityMap.get(key) ?? 0,
        inRange: cursor >= rangeStart && cursor <= today,
        isCurrentMonth: cursor.getMonth() === today.getMonth(),
      });
      cursor = addDays(cursor, 1);
    }

    weeks.push(week);
  }

  return weeks;
}

function buildMonthCells(activity: Streak["activity"], monthDate: Date): HeatmapCell[] {
  const activityMap = new Map(activity.map((item) => [item.date, item.count]));
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const cells: HeatmapCell[] = [];

  let cursor = new Date(calendarStart);
  while (cursor <= calendarEnd) {
    const key = toDateKey(cursor);
    cells.push({
      key,
      date: new Date(cursor),
      count: activityMap.get(key) ?? 0,
      inRange: true,
      isCurrentMonth: cursor.getMonth() === monthDate.getMonth(),
    });
    cursor = addDays(cursor, 1);
  }

  return cells;
}

function getIntensityLevel(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  if (maxCount <= 1) return 4;

  const ratio = count / maxCount;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.55) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

function formatCellTitle(date: Date, count: number): string {
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  if (count <= 0) {
    return `${formattedDate}: no entries`;
  }

  return `${formattedDate}: ${count} entr${count === 1 ? "y" : "ies"}`;
}

function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(value: Date): Date {
  const next = startOfDay(value);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function endOfWeek(value: Date): Date {
  const next = startOfWeek(value);
  next.setDate(next.getDate() + 6);
  return next;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
