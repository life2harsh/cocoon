import { Link } from "react-router-dom";
import { Glyph } from "@/components/Glyph";
import { InteractiveSurface } from "@/components/InteractiveSurface";
import { NightSky } from "@/components/NightSky";
import { Reveal } from "@/components/Reveal";
import ThemeToggle from "@/components/ThemeToggle";

const collections = [
  {
    title: "Free Write",
    summary: "Start with a blank notebook and write without structure when you just need space.",
    tag: "Blank Notebook",
    tone: "cocoon-tone-slate",
    icon: "book" as const,
  },
  {
    title: "Reflection",
    summary: "Use a guided space when you want a steadier prompt and a clearer way into the page.",
    tag: "Guided Journal",
    tone: "cocoon-tone-indigo",
    icon: "spark" as const,
  },
  {
    title: "Shared Journal",
    summary: "Invite someone in by code or link and keep one journal between the people who belong there.",
    tag: "Invite Only",
    tone: "cocoon-tone-rose",
    icon: "heart" as const,
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <NightSky />
      <div className="cocoon-ambient-orb cocoon-ambient-orb--left" />
      <div className="cocoon-ambient-orb cocoon-ambient-orb--right" />

      <main className="relative mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),rgba(168,192,216,0.9))] text-white shadow-[0_12px_28px_var(--shadow-soft)]">
              <Glyph name="leaf" className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl italic tracking-tight text-foreground">Cocoon</p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-foreground-muted">Private Journals</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/about" className="cocoon-button cocoon-button-secondary px-5 py-3 text-sm">
              About
            </Link>
            <ThemeToggle />
            <Link to="/login" className="cocoon-button cocoon-button-primary px-5 py-3 text-sm">
              Sign in
            </Link>
          </div>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          <Reveal delay={40}>
            <InteractiveSurface className="rounded-[2.5rem]">
              <div className="cocoon-hero-card relative overflow-hidden rounded-[2.5rem] px-8 py-10 text-white shadow-[0_32px_80px_var(--shadow)] sm:px-12 sm:py-14">
                <div className="relative">
                  <p className="inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">
                    Private Journals
                  </p>
                  <h1 className="mt-6 max-w-3xl font-display text-5xl leading-tight sm:text-6xl">
                    A calmer place to
                    <span className="block italic text-white/90">write, reflect, and share.</span>
                  </h1>
                  <p className="mt-6 max-w-2xl text-base leading-8 text-white/76">
                    Cocoon gives you private notebooks, shared journals, and daily prompts in one quieter space that feels intentional on desktop and mobile.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link to="/login" className="cocoon-button bg-white px-6 text-[#2a1b3d]">
                      Continue with Google
                    </Link>
                    <Link to="/about" className="cocoon-button border border-white/18 bg-white/10 px-6 text-white">
                      See how it works
                    </Link>
                  </div>
                </div>
              </div>
            </InteractiveSurface>
          </Reveal>

          <div className="grid gap-4">
            <Reveal delay={100}>
              <InteractiveSurface className="rounded-[2rem]">
                <div className="cocoon-panel p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Private by default</p>
                  <h2 className="mt-3 font-display text-3xl text-foreground">Your journals stay with the people you invite.</h2>
                  <p className="mt-4 text-sm leading-7 text-foreground-soft">
                    Start alone, keep a notebook to yourself, or open one shared space for a partner, friend, or collaborator when that makes sense.
                  </p>
                </div>
              </InteractiveSurface>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Reveal delay={160}>
                <InteractiveSurface className="rounded-[1.75rem]">
                  <div className="cocoon-card p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Daily prompts</p>
                    <p className="mt-3 font-display text-2xl text-foreground">Different per journal</p>
                  </div>
                </InteractiveSurface>
              </Reveal>
              <Reveal delay={220}>
                <InteractiveSurface className="rounded-[1.75rem]">
                  <div className="cocoon-card p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Available anywhere</p>
                    <p className="mt-3 font-display text-2xl text-foreground">Desktop and mobile PWA</p>
                  </div>
                </InteractiveSurface>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">Start Here</p>
              <h2 className="mt-2 font-display text-4xl text-foreground">Choose the kind of space you want to open</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-foreground-soft">
              Begin with a blank page, a guided reflection, or a shared journal. The app keeps the flow, prompts, and permissions aligned to that choice.
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {collections.map((item, index) => (
              <Reveal key={item.title} delay={80 + index * 80}>
                <InteractiveSurface className="rounded-[1.75rem]">
                  <article className="cocoon-card p-7">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] ${item.tone}`}>
                      <Glyph name={item.icon} className="h-6 w-6" />
                    </div>
                    <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground-muted">{item.tag}</p>
                    <h3 className="mt-2 font-display text-3xl text-foreground">{item.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-foreground-soft">{item.summary}</p>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Open after sign in
                      <Glyph name="arrow-right" className="h-4 w-4" />
                    </div>
                  </article>
                </InteractiveSurface>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
