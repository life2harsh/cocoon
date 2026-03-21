import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoadingPage from "@/pages/LoadingPage";
import { api, setToken } from "@/lib/api";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      const code = searchParams.get("code");
      if (!code) {
        setError("Missing Google auth code.");
        return;
      }

      try {
        const result = await api.auth.callback(code);
        if (cancelled) return;
        setToken(result.access_token);
        const next = sessionStorage.getItem("cocoon_next") || "/app";
        sessionStorage.removeItem("cocoon_next");
        navigate(next, { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Authentication failed.");
      }
    }

    void finishAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center px-6 py-16">
        <div className="cocoon-panel px-8 py-10 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-danger">Authentication failed</p>
          <p className="mt-4 text-sm leading-7 text-foreground-soft">{error}</p>
        </div>
      </main>
    );
  }

  return <LoadingPage label="Finishing sign-in..." />;
}

