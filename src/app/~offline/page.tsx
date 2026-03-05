export default function OfflinePage() {
  return (
    <main className="min-h-dvh bg-background px-6 py-16">
      <div className="mx-auto max-w-xl rounded-3xl bg-card p-8 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-soft">Offline</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground font-[family:var(--font-display)]">
          You are offline
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Cocoon needs a connection to sync new entries. We will reload automatically when you are back online.
        </p>
      </div>
    </main>
  );
}
