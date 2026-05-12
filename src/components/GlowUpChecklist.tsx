"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "fitapp-glow-up-checklist";

const glowUpTips = [
  {
    emoji: "💧",
    title: "Drink water first thing in the morning",
    detail: "Hydrate after sleep to support metabolism, skin hydration, and focus.",
  },
  {
    emoji: "💇",
    title: "Get a haircut that matches your face shape",
    detail: "The right hairstyle can sharpen your face and highlight bone structure.",
  },
  {
    emoji: "👁️",
    title: "Shape your eyebrows properly",
    detail: "Clean brows improve facial symmetry and make your face look more polished.",
  },
  {
    emoji: "🧼",
    title: "Use a face cleanser, not bar soap",
    detail: "A gentle cleanser protects your skin from dryness, irritation, and breakouts.",
  },
  {
    emoji: "🧴",
    title: "Moisturize twice a day",
    detail: "Hydrated skin looks smoother and healthier, even if your skin is oily.",
  },
  {
    emoji: "✨",
    title: "Exfoliate two times a week",
    detail: "Remove dead skin cells with the right exfoliant for your skin type.",
  },
  {
    emoji: "☀️",
    title: "Apply sunscreen daily",
    detail: "Use SPF 30 or higher every day to protect your skin from silent UV damage.",
  },
  {
    emoji: "😴",
    title: "Sleep at least 7 hours a night",
    detail: "Better sleep supports repair, energy, skin brightness, and fewer dark circles.",
  },
  {
    emoji: "🧍",
    title: "Fix your posture",
    detail: "Stand tall with your shoulders back to look more confident instantly.",
  },
  {
    emoji: "🦷",
    title: "Chew evenly on both sides",
    detail: "Balanced chewing may support better jaw symmetry over time.",
  },
  {
    emoji: "👅",
    title: "Practice mewing",
    detail: "Rest your tongue on the roof of your mouth to support nasal breathing and jaw posture.",
  },
  {
    emoji: "☕",
    title: "Use a caffeine eye serum",
    detail: "Help reduce morning puffiness and the look of dark circles.",
  },
  {
    emoji: "🪥",
    title: "Brush and floss twice a day",
    detail: "Fresh breath and clean teeth improve your presence immediately.",
  },
  {
    emoji: "😁",
    title: "Whiten your teeth at home carefully",
    detail: "Use whitening products naturally and avoid overdoing it.",
  },
  {
    emoji: "👅",
    title: "Use a tongue scraper daily",
    detail: "Remove bacteria and improve your breath as part of your hygiene routine.",
  },
  {
    emoji: "💅",
    title: "Trim your nails once a week",
    detail: "Clean nails show discipline and attention to detail.",
  },
  {
    emoji: "💋",
    title: "Exfoliate your lips and use lip balm",
    detail: "Keep lips soft and clean instead of dry or chapped.",
  },
  {
    emoji: "🧔",
    title: "Groom your beard for your face shape",
    detail: "The right beard style can make your face look sharper and more balanced.",
  },
  {
    emoji: "🪒",
    title: "Use a derma roller safely",
    detail: "Support beard or hair growth, and always clean the roller properly.",
  },
  {
    emoji: "👕",
    title: "Wear fitted clothes",
    detail: "Well-fitting clothes upgrade your look without needing designer brands.",
  },
  {
    emoji: "🎨",
    title: "Learn how to match colors",
    detail: "Wear colors that suit your skin tone so outfits look intentional.",
  },
  {
    emoji: "🧺",
    title: "Iron or steam your clothes",
    detail: "Pressed clothes look cleaner, sharper, and more put together.",
  },
  {
    emoji: "👟",
    title: "Keep your shoes clean",
    detail: "Fresh shoes are one of the first details people notice.",
  },
  {
    emoji: "🌬️",
    title: "Use a good cologne or body spray",
    detail: "Smelling good boosts confidence and leaves a stronger impression.",
  },
  {
    emoji: "🚿",
    title: "Shower daily and do it right",
    detail: "Clean underarms, neck, behind ears, feet, and your full body.",
  },
  {
    emoji: "🧖",
    title: "Use a separate towel for your face",
    detail: "Reduce bacteria transfer and help prevent breakouts.",
  },
  {
    emoji: "🩹",
    title: "Do not pop pimples",
    detail: "Use pimple patches or spot treatments like benzoyl peroxide or salicylic acid.",
  },
  {
    emoji: "📱",
    title: "Clean your phone screen regularly",
    detail: "Your phone touches your face and can carry oil, dirt, and bacteria.",
  },
  {
    emoji: "🛏️",
    title: "Change your pillowcase every 3 days",
    detail: "Fresh pillowcases reduce sweat and oil buildup on your skin.",
  },
  {
    emoji: "✂️",
    title: "Line up your beard and neckline weekly",
    detail: "A clean shape adds structure even if your beard is light.",
  },
  {
    emoji: "🧴",
    title: "Use beard oil or balm",
    detail: "Soften your beard, reduce itch, and make it look healthier.",
  },
  {
    emoji: "🏋️",
    title: "Start working out or doing home exercises",
    detail: "Exercise shapes your body, improves posture, and supports confidence.",
  },
  {
    emoji: "🚶",
    title: "Walk 5,000 to 10,000 steps daily",
    detail: "Daily movement helps fat loss, blood flow, posture, and energy.",
  },
  {
    emoji: "🫁",
    title: "Practice deep breathing exercises",
    detail: "Lower stress, sharpen focus, and support a calmer appearance.",
  },
  {
    emoji: "🧊",
    title: "Take cold showers two or three times a week",
    detail: "Cold water can support circulation, skin tone, and mood.",
  },
  {
    emoji: "🍬",
    title: "Cut down sugar and junk food",
    detail: "Reduce breakouts, dullness, bloating, and low energy.",
  },
  {
    emoji: "🥗",
    title: "Eat fruits and vegetables daily",
    detail: "Get vitamins that support skin, energy, and overall glow from inside out.",
  },
  {
    emoji: "🐟",
    title: "Take omega-3 supplements",
    detail: "Support skin texture and help reduce inflammation.",
  },
  {
    emoji: "🧖",
    title: "Use clay masks for oily areas",
    detail: "Once a week can help reduce shine and clear pores.",
  },
  {
    emoji: "👃",
    title: "Trim visible nose and ear hair",
    detail: "Small grooming details make a big difference in cleanliness.",
  },
  {
    emoji: "😊",
    title: "Smile more often",
    detail: "A relaxed smile makes you look confident, friendly, and attractive.",
  },
  {
    emoji: "👀",
    title: "Make strong eye contact",
    detail: "Good eye contact shows confidence and builds trust.",
  },
  {
    emoji: "🧹",
    title: "Keep your room clean and organized",
    detail: "Your environment supports your mindset and discipline.",
  },
  {
    emoji: "📚",
    title: "Read more books",
    detail: "Build your mind, speaking skills, and personal charm.",
  },
  {
    emoji: "📸",
    title: "Take progress pictures every 2 weeks",
    detail: "Photos help you notice progress you may miss day to day.",
  },
  {
    emoji: "📅",
    title: "Stay consistent with your routine",
    detail: "The real glow up comes from not quitting after one week.",
  },
  {
    emoji: "🪮",
    title: "Learn how to style your hair",
    detail: "Watch tutorials, experiment, and find what flatters your face best.",
  },
  {
    emoji: "🍵",
    title: "Drink green tea or lemon water",
    detail: "Support hydration and reduce bloating as part of your routine.",
  },
  {
    emoji: "🌙",
    title: "Cut screen time one hour before bed",
    detail: "Give your brain and skin time to recover before sleep.",
  },
  {
    emoji: "🤍",
    title: "Be kind to yourself",
    detail: "True confidence starts with how you treat yourself.",
  },
];

export function GlowUpChecklist() {
  const [checkedTips, setCheckedTips] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      setCheckedTips(JSON.parse(saved) as Record<number, boolean>);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedTips));
  }, [checkedTips]);

  const completedCount = useMemo(
    () => Object.values(checkedTips).filter(Boolean).length,
    [checkedTips],
  );

  return (
    <section className="rounded-3xl border border-white/15 bg-[var(--surface)]/90 p-4 shadow-2xl backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface)]/75 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Section 1</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">
            50 Glow-Up Habits Checklist
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Pick five habits, follow them for two weeks, then add five more. Check each title when you complete that
            rule today.
          </p>
        </div>
        <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-50">
          <strong className="text-xl">{completedCount}</strong>
          <span className="text-[var(--muted)]"> / {glowUpTips.length} done</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {glowUpTips.map((tip, index) => (
          <label
            key={tip.title}
            className="group flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-sky-300/40 hover:bg-sky-400/10"
          >
            <input
              type="checkbox"
              checked={Boolean(checkedTips[index])}
              onChange={(event) =>
                setCheckedTips((current) => ({
                  ...current,
                  [index]: event.target.checked,
                }))
              }
              className="mt-1 size-5 shrink-0 rounded border-white/30 bg-black/40 accent-[var(--accent)]"
            />
            <span className="min-w-0">
              <span className="flex items-start gap-2 text-sm font-semibold leading-5 text-white">
                <span aria-hidden="true" className="text-lg leading-none">
                  {tip.emoji}
                </span>
                <span>
                  {index + 1}. {tip.title}
                </span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{tip.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
