import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 animate-rise motion-reduce:animate-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground font-[family:var(--font-display)]">
          How it works
        </h1>
        <Link
          href="/"
          className="rounded-full px-3 py-2 text-sm text-ink-muted ring-1 ring-stroke transition hover:bg-card"
        >
          Home
        </Link>
      </div>

      <p className="mt-6 text-base leading-7 text-ink-muted">
        Cocoon is a shared journal for thoughts, venting, and quiet reflections.
        Write privately or invite a few people into the same notebook when it
        helps.
      </p>

      <div className="mt-10 grid gap-4">
        <div className="rounded-2xl bg-card p-5 ring-1 ring-stroke shadow-[0_16px_40px_var(--shadow)]">
          <p className="text-sm font-medium text-foreground">Shared notebooks</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Invite by link or code. Keep it private by default.
          </p>
        </div>
        <div className="rounded-2xl bg-card p-5 ring-1 ring-stroke shadow-[0_16px_40px_var(--shadow)]">
          <p className="text-sm font-medium text-foreground">Daily reminders</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Gentle nudges you can turn on after your first notebook.
          </p>
        </div>
        <div className="rounded-2xl bg-card p-5 ring-1 ring-stroke shadow-[0_16px_40px_var(--shadow)]">
          <p className="text-sm font-medium text-foreground">Edit, don’t erase</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Entries can be updated, but not deleted.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/60 transition duration-200 hover:-translate-y-0.5 hover:bg-accent-strong"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
