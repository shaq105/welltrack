import { useState } from 'react';

interface Props {
  displayName: string;
  onComplete: () => void;
}

const STEPS = [
  {
    title: 'Welcome to WellTrack!',
    body: (name: string) => (
      <>
        <p className="text-sage-600">
          Hi <span className="font-semibold text-teal-700">{name}</span>! WellTrack helps you log
          your daily health data — symptoms, mood, medications, and habits — so you can spot trends
          and have richer conversations with your healthcare team.
        </p>
      </>
    ),
    illustration: (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 text-5xl">
        🌿
      </div>
    ),
  },
  {
    title: 'Log what matters',
    body: () => (
      <ul className="space-y-3 text-sm text-sage-600">
        {[
          { icon: '🩺', label: 'Symptoms', desc: 'Track severity (1–10) and notes for any symptom.' },
          { icon: '😊', label: 'Mood', desc: 'Log mood, energy, and stress scores (1–5).' },
          { icon: '💊', label: 'Medications', desc: 'Record whether you took each medication.' },
          { icon: '🏃', label: 'Habits', desc: 'Track sleep, water intake, exercise, and more.' },
        ].map(({ icon, label, desc }) => (
          <li key={label} className="flex items-start gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <span className="font-semibold text-sage-800">{label}</span>
              <p>{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    ),
    illustration: null,
  },
  {
    title: 'Discover your trends',
    body: () => (
      <div className="space-y-3 text-sm text-sage-600">
        <p>
          After a week or two of logging, WellTrack will surface{' '}
          <span className="font-semibold text-teal-700">correlation insights</span> — for example:{' '}
          <em>"Your mood scores are higher on days you exercise."</em>
        </p>
        <p>
          Visit the <span className="font-semibold text-sage-800">Trends</span> page for charts and
          the <span className="font-semibold text-sage-800">Insights</span> page for habit
          correlations.
        </p>
        <p>
          You can also export a <span className="font-semibold text-sage-800">PDF report</span>{' '}
          formatted for doctor visits from the Settings → Data section.
        </p>
      </div>
    ),
    illustration: (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 text-5xl">
        📈
      </div>
    ),
  },
  {
    title: "You're all set!",
    body: () => (
      <p className="text-sage-600">
        Head to your <span className="font-semibold text-teal-700">Dashboard</span> and make your
        first log. The quick-add buttons at the top let you record anything in seconds. Happy
        tracking!
      </p>
    ),
    illustration: (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 text-5xl">
        ✅
      </div>
    ),
  },
];

export default function OnboardingModal({ displayName, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* Progress dots */}
        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === step ? 'bg-teal-600' : 'bg-sage-200'
              }`}
            />
          ))}
        </div>

        {/* Illustration */}
        {current.illustration && (
          <div className="mb-4 flex justify-center">{current.illustration}</div>
        )}

        {/* Title */}
        <h2 className="mb-3 text-center text-xl font-bold text-teal-800">{current.title}</h2>

        {/* Body */}
        <div className="mb-8">{current.body(displayName)}</div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="rounded-lg border border-sage-300 px-4 py-2 text-sm text-sage-700 transition hover:bg-sage-100"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="text-sm text-sage-400 transition hover:text-sage-600"
            >
              Skip
            </button>
          )}
          <button
            onClick={isLast ? onComplete : () => setStep((s) => s + 1)}
            className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
