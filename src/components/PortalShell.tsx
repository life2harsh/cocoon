import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Glyph } from "@/components/Glyph";
import { NightSky } from "@/components/NightSky";
import { NotificationBell } from "@/components/NotificationBell";
import { ReminderScheduler } from "@/components/ReminderScheduler";
import ThemeToggle from "@/components/ThemeToggle";

type ActiveView = "home" | "journal" | "settings";

type UserSummary = {
  id?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

const desktopNav = [
  { key: "home" as const, href: "/app", label: "Home", icon: "home" as const },
  { key: "journal" as const, href: "/app/journals", label: "Journal", icon: "book" as const },
  { key: "settings" as const, href: "/app/settings", label: "Settings", icon: "settings" as const },
];

export function PortalShell({
  active,
  eyebrow,
  title,
  subtitle,
  user,
  primaryAction,
  headerAction,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  rightRail,
  children,
}: {
  active: ActiveView;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  user?: UserSummary | null;
  primaryAction?: ReactNode;
  headerAction?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  rightRail?: ReactNode;
  children: ReactNode;
}) {
  const hasRail = Boolean(rightRail);
  const initials = (user?.display_name || "C")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative min-h-dvh cocoon-fade-in">
      <ReminderScheduler userId={user?.id} />
      <NightSky />
      <div className="cocoon-ambient-orb cocoon-ambient-orb--left fixed -z-10" />
      <div className="cocoon-ambient-orb cocoon-ambient-orb--right fixed -z-10" />

      <aside className="cocoon-glass hidden xl:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-stroke px-7 py-7">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),rgba(168,192,216,0.9))] text-white shadow-[0_14px_28px_var(--shadow-soft)]">
            <Glyph name="leaf" className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-2xl italic tracking-tight text-foreground">Cocoon</p>
            <p className="text-[10px] uppercase tracking-[0.28em] text-foreground-muted">Private Journals</p>
          </div>
        </Link>

        <nav className="mt-12 flex flex-1 flex-col gap-2">
          {desktopNav.map((item) => {
            const activeItem = item.key === active;
            return (
              <Link
                key={item.key}
                to={item.href}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                  activeItem
                    ? "cocoon-glass-strong text-foreground shadow-[0_10px_28px_var(--shadow-soft)]"
                    : "text-foreground-soft hover:bg-[color:var(--glass-subtle)] hover:text-foreground"
                }`}
              >
                {activeItem ? (
                  <span className="absolute left-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-primary" />
                ) : null}
                <Glyph name={item.icon} className="h-5 w-5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-stroke pt-6">
          <div className="cocoon-soft-card px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-foreground-muted">Privacy</p>
            <p className="mt-2 text-sm leading-7 text-foreground-soft">Your journals stay private unless you share one.</p>
          </div>
          {primaryAction ? <div>{primaryAction}</div> : null}
        </div>
      </aside>

      <div className={`relative ${hasRail ? "xl:mr-[22rem]" : ""} xl:ml-64`}>
        <header className="cocoon-glass sticky top-0 z-20 border-b border-stroke px-3.5 py-3 sm:px-8 sm:py-4 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
              {eyebrow ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-1 text-[1.6rem] font-display leading-tight tracking-tight text-foreground sm:text-[2.8rem]">
                {title}
              </h1>
              {subtitle ? <p className="mt-2 max-w-2xl text-[13px] leading-6 text-foreground-soft sm:text-base">{subtitle}</p> : null}
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
                {onSearchChange ? (
                  <label className="cocoon-glass-subtle hidden min-w-[14rem] items-center gap-2 rounded-full border border-stroke px-4 py-2 text-sm text-foreground-muted lg:flex">
                    <Glyph name="search" className="h-4 w-4" />
                    <input
                      type="search"
                      value={searchValue || ""}
                      onChange={(event) => onSearchChange(event.target.value)}
                      placeholder={searchPlaceholder || "Search"}
                      className="min-w-0 bg-transparent text-foreground placeholder:text-foreground-muted focus:outline-none"
                    />
                  </label>
                ) : null}
                <NotificationBell user={user} />
                <ThemeToggle />
                {headerAction}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stroke bg-card-muted text-sm font-semibold text-primary sm:h-11 sm:w-11">
                  {user?.avatar_url ? (
                    <img
                      alt={user.display_name || "User avatar"}
                      className="h-full w-full object-cover"
                      src={user.avatar_url}
                    />
                  ) : (
                    initials || "C"
                  )}
                </div>
              </div>
            </div>

            {onSearchChange ? (
              <label className="cocoon-glass-subtle mt-4 flex items-center gap-2 rounded-full border border-stroke px-4 py-3 text-sm text-foreground-muted lg:hidden">
                <Glyph name="search" className="h-4 w-4" />
                <input
                  type="search"
                  value={searchValue || ""}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder || "Search"}
                  className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-foreground-muted focus:outline-none"
                />
              </label>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3.5 pb-40 pt-5 sm:px-8 sm:pb-32 sm:pt-6 lg:px-12">{children}</main>

        {rightRail ? (
          <section className="mx-auto max-w-6xl px-3.5 pb-40 sm:px-8 sm:pb-32 xl:hidden">
            <div className="grid gap-5">{rightRail}</div>
          </section>
        ) : null}
      </div>

      {rightRail ? (
        <aside className="cocoon-glass hidden xl:block fixed inset-y-0 right-0 z-10 w-[22rem] border-l border-stroke px-6 py-7">
          <div className="h-full overflow-y-auto cocoon-scroll pr-2">{rightRail}</div>
        </aside>
      ) : null}

      <nav className="cocoon-glass-strong cocoon-mobile-nav fixed inset-x-2.5 bottom-2.5 z-40 flex items-center justify-around rounded-[1.55rem] border border-stroke px-2 pt-2 shadow-[0_-2px_24px_var(--shadow-soft)] xl:hidden">
        {desktopNav.map((item) => {
          const activeItem = item.key === active;
          return (
            <Link
              key={item.key}
              to={item.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-[1.15rem] px-2 py-2 ${
                activeItem ? "bg-primary-soft text-primary" : "text-foreground-muted"
              }`}
            >
              <Glyph name={item.icon} className="h-5 w-5" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
