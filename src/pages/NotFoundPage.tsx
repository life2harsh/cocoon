import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center px-6 py-16">
      <div className="cocoon-panel px-8 py-10 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">404</p>
        <h1 className="mt-4 font-display text-4xl text-foreground">Page not found.</h1>
        <p className="mt-4 text-sm leading-7 text-foreground-soft">The page you were trying to open does not exist.</p>
        <div className="mt-6">
          <Link to="/" className="cocoon-button cocoon-button-primary">
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
