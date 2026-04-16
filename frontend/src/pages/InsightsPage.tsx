import { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import type { Correlation, CorrelationMeta } from '../types/api';

interface CorrelationsResponse {
  correlations: Correlation[];
  meta: CorrelationMeta;
}

function DirectionBadge({ direction }: { direction: 'positive' | 'negative' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        direction === 'positive'
          ? 'bg-teal-100 text-teal-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      {direction === 'positive' ? '↑ Positive' : '↓ Negative'}
    </span>
  );
}

function outcomeTypeLabel(type: Correlation['outcomeType']): string {
  switch (type) {
    case 'mood': return 'Mood score';
    case 'energy': return 'Energy level';
    case 'stress': return 'Stress level';
    case 'symptom': return 'Symptom severity';
  }
}

export default function InsightsPage() {
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [meta, setMeta] = useState<CorrelationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiClient
      .get<CorrelationsResponse>('/api/insights/correlations')
      .then(({ data }) => {
        setCorrelations(data.correlations);
        setMeta(data.meta);
      })
      .catch(() => setError('Failed to load insights.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-teal-800">Insights</h1>
        <p className="mt-1 text-sm text-sage-500">
          Habit correlations based on the last 90 days of your logs.
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-sage-200 bg-white p-8 text-center">
          <p className="text-sm text-sage-500">Analysing your data…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && meta && !meta.hasEnoughData && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-1 text-base font-semibold text-amber-800">Not enough data yet</h2>
          <p className="text-sm text-amber-700">{meta.message}</p>
          <div className="mt-4 flex gap-6 text-sm text-amber-600">
            <span>Days analysed: <strong>{meta.daysAnalyzed}</strong></span>
            <span>Habits tracked: <strong>{meta.habitsTracked}</strong></span>
          </div>
        </div>
      )}

      {!loading && !error && meta?.hasEnoughData && correlations.length === 0 && (
        <div className="rounded-xl border border-sage-200 bg-white p-8 text-center">
          <p className="text-sm text-sage-500">
            No strong correlations detected yet. Keep logging and check back after a few more weeks.
          </p>
        </div>
      )}

      {!loading && !error && correlations.length > 0 && (
        <>
          <div className="flex gap-4 text-sm text-sage-500">
            <span>Days analysed: <strong className="text-sage-700">{meta?.daysAnalyzed}</strong></span>
            <span>Correlations found: <strong className="text-sage-700">{correlations.length}</strong></span>
          </div>

          <ul className="space-y-4">
            {correlations.map((c, i) => (
              <li
                key={i}
                className="rounded-xl border border-sage-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-sage-800">{c.habitName}</span>
                    <span className="text-xs text-sage-400">→</span>
                    <span className="text-sm font-medium text-teal-700">{c.outcomeName}</span>
                    <span className="text-xs text-sage-400">({outcomeTypeLabel(c.outcomeType)})</span>
                  </div>
                  <DirectionBadge direction={c.direction} />
                </div>

                <p className="mb-3 text-sm text-sage-600">{c.description}</p>

                <div className="flex flex-wrap gap-6 text-xs text-sage-500">
                  <div>
                    <span className="font-medium text-sage-700">With habit: </span>
                    {c.withHabit}
                  </div>
                  <div>
                    <span className="font-medium text-sage-700">Without habit: </span>
                    {c.withoutHabit}
                  </div>
                  <div>
                    <span className="font-medium text-sage-700">Difference: </span>
                    {c.difference}
                  </div>
                  <div>
                    <span className="font-medium text-sage-700">Sample days: </span>
                    {c.sampleSize}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-xs text-sage-400">
            Correlations are based on averages and are not medical advice. They require at least 3
            matching days in each group to appear.
          </p>
        </>
      )}
    </div>
  );
}
