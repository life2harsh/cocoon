import { useState } from "react";
import { Glyph } from "@/components/Glyph";
import { InteractiveSurface } from "@/components/InteractiveSurface";
import { Reveal } from "@/components/Reveal";

interface Props {
  onSelect: (template: string) => void;
  onClose: () => void;
}

const templates = [
  { id: "couple", name: "Shared Journal", description: "A journal for two people writing in the same space.", icon: "heart" as const, tone: "cocoon-tone-rose" },
  { id: "free_write", name: "Free Write", description: "A blank notebook with no fixed structure.", icon: "book" as const, tone: "cocoon-tone-slate" },
  { id: "reflection", name: "Reflection", description: "A guided space for looking back on the day.", icon: "spark" as const, tone: "cocoon-tone-indigo" },
  { id: "gratitude", name: "Gratitude", description: "A place to capture what felt grounding or kind.", icon: "leaf" as const, tone: "cocoon-tone-amber" },
  { id: "cbt", name: "CBT Focus", description: "Challenge patterns and reframe them with care.", icon: "spark" as const, tone: "cocoon-tone-blue" },
  { id: "habit", name: "Habit Tracker", description: "Keep short notes around routines you want to maintain.", icon: "grid" as const, tone: "cocoon-tone-emerald" },
];

export function JournalTemplatePicker({ onSelect, onClose }: Props) {
  const [selected, setSelected] = useState<string>("free_write");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cocoon-overlay absolute inset-0" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-3xl overflow-y-auto cocoon-scroll cocoon-panel p-5 sm:p-6 cocoon-rise">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">New journal</p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Choose a journal type.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground-soft">
              Each option uses a real journal mode in the backend, so prompts, sharing, and writing behavior stay matched to what you pick.
            </p>
          </div>
          <button type="button" onClick={onClose} className="cocoon-glass-subtle rounded-full border border-stroke p-2 text-foreground-soft">
            <Glyph name="more" className="h-4 w-4 rotate-90" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {templates.map((template, index) => {
            const active = selected === template.id;
            return (
              <Reveal key={template.id} delay={index * 70}>
                <InteractiveSurface className="rounded-[1.6rem]">
                  <button
                    type="button"
                    onClick={() => setSelected(template.id)}
                    className={`w-full rounded-[1.6rem] border p-5 text-left ${
                      active ? "border-primary bg-primary-soft shadow-[0_14px_28px_var(--shadow-soft)]" : "border-stroke bg-[color:var(--glass)]"
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] ${template.tone}`}>
                      <Glyph name={template.icon} className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-display text-2xl text-foreground">{template.name}</h3>
                    <p className="mt-3 text-sm leading-7 text-foreground-soft">{template.description}</p>
                  </button>
                </InteractiveSurface>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onSelect("free_write")} className="cocoon-button cocoon-button-secondary">
            Start blank
          </button>
          <button type="button" onClick={() => onSelect(selected)} className="cocoon-button cocoon-button-primary">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
