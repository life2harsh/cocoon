export default function LoadingPage({ label = "Loading..." }: { label?: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center px-6 py-16">
      <div className="cocoon-panel px-8 py-10 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary" />
        <p className="mt-5 text-sm font-medium text-foreground-soft">{label}</p>
      </div>
    </main>
  );
}

