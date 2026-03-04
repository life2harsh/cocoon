import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden cocoon-shell">
      <div className="pointer-events-none absolute -top-32 left-10 h-72 w-72 rounded-full cocoon-glow-warm blur-3xl animate-glow motion-reduce:animate-none" />
      <div className="pointer-events-none absolute top-12 right-10 h-80 w-80 rounded-full cocoon-glow-sage blur-3xl animate-float-slow motion-reduce:animate-none" />
      <main className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-ink ring-1 ring-stroke shadow-[0_10px_30px_var(--shadow)]" />
            <div>
              <p className="text-sm font-medium tracking-wide text-ink-muted font-[family:var(--font-display)]">
                Cocoon
              </p>
              <p className="text-xs text-ink-soft">A warm, shared journal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_var(--shadow)] ring-1 ring-white/20 transition duration-200 hover:-translate-y-0.5 hover:bg-ink-hover"
            >
              Sign in
            </Link>
          </div>
        </header>

        <section className="mt-16 grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7 animate-rise motion-reduce:animate-none">
            <div className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs text-ink-muted ring-1 ring-stroke">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_var(--glow)]" />
              Private by default. Share when you want.
            </div>
            <h1 className="mt-6 text-pretty text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl font-[family:var(--font-display)]">
              A calm place for thoughts, together or alone.
            </h1>
            <p className="mt-5 max-w-xl text-balance text-lg leading-8 text-ink-muted">
              A shared space for reflection, venting, and the moments that linger.
              Write solo, or invite others into the same notebook when it helps.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/40 transition duration-200 hover:-translate-y-0.5 hover:bg-accent-strong"
              >
                Continue with Google
              </Link>
              <Link
                href="/about"
                className="inline-flex h-12 items-center justify-center rounded-full bg-card px-6 text-sm font-medium text-foreground ring-1 ring-stroke transition duration-200 hover:-translate-y-0.5 hover:bg-card-strong"
              >
                How it works
              </Link>
            </div>
          </div>

          <div className="md:col-span-5 animate-rise-delay motion-reduce:animate-none">
            <div className="rounded-3xl bg-card p-5 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)] backdrop-blur">
              <div className="rounded-2xl bg-ink p-5 text-white shadow-[0_12px_30px_var(--shadow)]">
                <p className="text-sm font-medium tracking-wide text-white/70">
                  Today
                </p>
                <p className="mt-2 text-lg leading-7">
                  A private page for what you are carrying. A place to soften the
                  day.
                </p>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-card-strong p-4 ring-1 ring-stroke">
                  <p className="text-sm font-medium text-foreground">
                    Shared notebooks
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    Invite by link or code. Keep it private by default.
                  </p>
                </div>
                <div className="rounded-2xl bg-card-strong p-4 ring-1 ring-stroke">
                  <p className="text-sm font-medium text-foreground">Gentle cues</p>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    Daily reminders only when you ask for them.
                  </p>
                </div>
                <div className="rounded-2xl bg-card-strong p-4 ring-1 ring-stroke">
                  <p className="text-sm font-medium text-foreground">Quiet by design</p>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    Focused writing spaces, no task lists.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-auto pt-14 text-xs text-ink-soft">
          <p>Private by default. Invite people when you choose.</p>
        </footer>
      </main>
    </div>
  );
}
