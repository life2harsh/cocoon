export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16 animate-rise motion-reduce:animate-none">
      <p className="text-sm font-medium tracking-wide text-ink-soft">Offline</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground font-[family:var(--font-display)]">
        You’re not connected.
      </h1>
      <p className="mt-4 text-base leading-7 text-ink-muted">
        Reconnect to sync your journals. If you already opened the app once, you
        can keep browsing cached pages.
      </p>
      <p className="mt-8 text-sm text-ink-soft">
        Tip: add this app to your home screen for a smoother feel.
      </p>
    </main>
  );
}
