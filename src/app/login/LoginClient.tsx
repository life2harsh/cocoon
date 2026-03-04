"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginClient() {
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") ?? "/app", [searchParams]);

  async function onGoogle() {
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL(
          `/auth/callback?next=${encodeURIComponent(next)}`,
          origin
        ).toString(),
      },
    });
    if (error) setPending(false);
  }

  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-stroke shadow-[0_20px_50px_var(--shadow)] backdrop-blur animate-rise motion-reduce:animate-none">
      <p className="text-sm font-medium tracking-wide text-ink-soft">Sign in</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground font-[family:var(--font-display)]">
        Welcome back.
      </h1>
      <p className="mt-3 text-base leading-7 text-ink-muted">
        Use Google to return to your journals.
      </p>

      <button
        type="button"
        onClick={onGoogle}
        disabled={pending}
        className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-accent px-6 text-sm font-semibold text-white shadow-[0_10px_30px_var(--shadow)] ring-1 ring-white/60 transition duration-200 hover:-translate-y-0.5 hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Opening Google..." : "Continue with Google"}
      </button>

      <p className="mt-6 text-xs leading-5 text-ink-soft">
        By continuing, you’ll create an account if you don’t have one.
      </p>
    </div>
  );
}
