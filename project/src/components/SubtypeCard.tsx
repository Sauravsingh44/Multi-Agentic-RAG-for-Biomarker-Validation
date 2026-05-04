import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { AnalysisResults, Subtype } from '../types';

interface SubtypeCardProps {
  results: AnalysisResults;
}

type CancerType = 'lung' | 'colorectal';

function getCancerType(subtype: Subtype): CancerType {
  return subtype === 'Colon Adenocarcinoma' || subtype === 'Rectal Adenocarcinoma'
    ? 'colorectal'
    : 'lung';
}

const SUBTYPE_META: Record<Subtype, { label: string; color: 'cyan' | 'orange' | 'violet' | 'rose' }> = {
  LUAD: { label: 'Lung Adenocarcinoma', color: 'cyan' },
  LUSC: { label: 'Lung Squamous Cell Carcinoma', color: 'orange' },
  'Colon Adenocarcinoma': { label: 'Colon Adenocarcinoma', color: 'violet' },
  'Rectal Adenocarcinoma': { label: 'Rectal Adenocarcinoma', color: 'rose' },
};

const COLOR_STYLES = {
  cyan:   { border: 'border-cyan-500/50',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   hex: '#22d3ee' },
  orange: { border: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-400', hex: '#f97316' },
  violet: { border: 'border-violet-500/50', bg: 'bg-violet-500/10', text: 'text-violet-400', hex: '#a78bfa' },
  rose:   { border: 'border-rose-500/50',   bg: 'bg-rose-500/10',   text: 'text-rose-400',   hex: '#fb7185' },
};

function getBarColor(name: string): string {
  const map: Record<string, string> = {
    LUAD: COLOR_STYLES.cyan.hex,
    LUSC: COLOR_STYLES.orange.hex,
    'Colon Adenocarcinoma': COLOR_STYLES.violet.hex,
    'Rectal Adenocarcinoma': COLOR_STYLES.rose.hex,
  };
  return map[name] ?? '#6b7280';
}

export default function SubtypeCard({ results }: SubtypeCardProps) {
  const meta = SUBTYPE_META[results.subtype] ?? { label: results.subtype, color: 'cyan' as const };
  const style = COLOR_STYLES[meta.color];
  const cancerType = getCancerType(results.subtype);
  const isShortCode = results.subtype === 'LUAD' || results.subtype === 'LUSC';
  const confidencePercent =
    Number(results.confidence) <= 1
      ? Number(results.confidence) * 100
      : Number(results.confidence);

  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
        Subtype Prediction
      </h3>
      <p className="text-xs text-gray-600 mb-5 capitalize">{cancerType} cancer</p>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Badge */}
        <div className="flex flex-col items-center">
          <div className={`px-8 py-5 rounded-2xl border-2 text-center ${style.border} ${style.bg}`}>
            <p className={`font-black tracking-wider ${style.text} ${isShortCode ? 'text-5xl' : 'text-xl leading-tight'}`}>
              {results.subtype}
            </p>
            {isShortCode && (
              <p className="text-xs text-gray-500 mt-1">{meta.label}</p>
            )}
          </div>
          <div className="mt-4 text-center">
            <p className="text-3xl font-bold text-gray-100">{confidencePercent.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Confidence Score</p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex-1 w-full" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={results.subtypeScores}
              layout="vertical"
              margin={{ left: 0, right: 20, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={180}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Score']}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
                {results.subtypeScores.map((entry) => (
                  <Cell key={entry.name} fill={getBarColor(entry.name)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}