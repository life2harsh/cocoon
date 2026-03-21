import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">About Cocoon</p>
          <h1 className="mt-3 font-display text-5xl text-foreground">Private journals, shared when you choose.</h1>
        </div>
        <Link to="/" className="cocoon-button cocoon-button-secondary px-5 py-3 text-sm">
          Back Home
        </Link>
      </div>

      <p className="mt-8 max-w-3xl text-base leading-8 text-foreground-soft">
        Cocoon is a journaling app for private writing, shared notebooks, and daily prompts. You can keep a journal to yourself, invite another person into one space, and pick different prompt behavior for each journal.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          ["Shared notebooks", "Invite someone by code or link when you want one journal between the right people."],
          ["Daily prompts", "Get a prompt that matches the journal type and turn it on or off per journal."],
          ["Write anywhere", "Use the same journals across desktop and mobile, including the installed PWA."],
        ].map(([title, copy]) => (
          <div key={title} className="cocoon-card p-6">
            <h2 className="font-display text-3xl text-foreground">{title}</h2>
            <p className="mt-4 text-sm leading-7 text-foreground-soft">{copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link to="/login" className="cocoon-button cocoon-button-primary">
          Sign in
        </Link>
      </div>
    </main>
  );
}
