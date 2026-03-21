import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Glyph } from "@/components/Glyph";
import { NightSky } from "@/components/NightSky";
import ThemeToggle from "@/components/ThemeToggle";
import { api, getToken } from "@/lib/api";

const INTRO_STORAGE_KEY = "cocoon_login_intro_seen";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [introActive, setIntroActive] = useState(false);
  const [introVisible, setIntroVisible] = useState(false);
  const [introFading, setIntroFading] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [logoFading, setLogoFading] = useState(false);
  const [cometVisible, setCometVisible] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) {
      navigate("/app", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";
    const introSeen = window.sessionStorage.getItem(INTRO_STORAGE_KEY) === "true";

    if (prefersReducedMotion || !isDarkTheme || introSeen) {
      return;
    }

    window.sessionStorage.setItem(INTRO_STORAGE_KEY, "true");

    const timers = [
      window.setTimeout(() => {
        setIntroActive(true);
        setIntroVisible(true);
      }, 0),
      window.setTimeout(() => setLogoVisible(true), 280),
      window.setTimeout(() => setCometVisible(true), 1450),
      window.setTimeout(() => setLogoFading(true), 3020),
      window.setTimeout(() => setIntroFading(true), 3560),
      window.setTimeout(() => setIntroVisible(false), 4180),
      window.setTimeout(() => setIntroActive(false), 4300),
    ];

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  async function handleGoogle() {
    setLoading(true);
    try {
      const next = searchParams.get("next");
      if (next) {
        sessionStorage.setItem("cocoon_next", next);
      } else {
        sessionStorage.removeItem("cocoon_next");
      }
      const { auth_url } = await api.auth.google();
      window.location.href = auth_url;
    } catch (error) {
      console.error("Auth error:", error);
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden px-6 py-8 sm:px-8 lg:px-12">
      <NightSky />
      {introVisible ? (
        <div className={`cocoon-intro-overlay ${introFading ? "is-fading" : ""}`}>
          <div className={`cocoon-intro-logo ${logoVisible ? "is-visible" : ""} ${logoFading ? "is-fading" : ""}`}>
            Cocoon
          </div>
          <div className={`cocoon-intro-comet ${cometVisible ? "is-active" : ""}`} />
        </div>
      ) : null}

      <div
        className={`relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl items-center justify-center transition-[opacity,transform] duration-700 ${
          introActive ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="cocoon-auth-card cocoon-rise w-full max-w-[26rem] px-6 py-6 sm:px-7 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="cocoon-auth-chip">
                <Glyph name="star" className="h-3.5 w-3.5" />
                Sign in
              </div>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
                  <Glyph name="leaf" className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="cocoon-auth-logo text-foreground">Cocoon</h1>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-foreground-muted">Digital Atrium</p>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-7 text-foreground-soft">
                Private journals for your own reflections, and shared spaces only for the people you invite inside.
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="cocoon-auth-panel mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Secure access</p>
            <h2 className="mt-3 font-display text-[2.2rem] leading-tight text-foreground">Sign in to your journals.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-foreground-soft">
              Continue with Google to open your journals, prompts, and shared spaces on this account.
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="cocoon-button cocoon-button-primary mt-8 w-full justify-center py-4 text-base"
            >
              <span>{loading ? "Opening Google..." : "Continue with Google"}</span>
              <Glyph name="arrow-right" className="h-4 w-4" />
            </button>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="cocoon-auth-note">
                <Glyph name="lock" className="h-4 w-4" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">Encrypted</p>
                  <p className="mt-1 text-xs leading-6 text-foreground-muted">Your entries stay sealed to the journal members who should see them.</p>
                </div>
              </div>
              <div className="cocoon-auth-note">
                <Glyph name="people" className="h-4 w-4" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">Invite only</p>
                  <p className="mt-1 text-xs leading-6 text-foreground-muted">Shared journals appear only when someone has actually added you.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
