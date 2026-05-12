import { GlowUpChecklist } from "@/components/GlowUpChecklist";
import { Tracker } from "@/components/Tracker";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-3 py-4 sm:px-4 sm:py-8">
      <GlowUpChecklist />

      <section className="rounded-3xl border border-white/15 bg-[var(--surface)]/90 p-4 shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface)]/75 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Section 2</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Health Tracker</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          This area is ready for the health tracker updates planned for the following weeks.
        </p>
      </section>

      <section className="rounded-3xl border border-white/15 bg-black/20 py-2 shadow-xl backdrop-blur-md">
        <div className="px-4 pt-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">Section 3</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Existing FitApp</h2>
        </div>
        <Tracker />
      </section>
    </main>
  );
}
