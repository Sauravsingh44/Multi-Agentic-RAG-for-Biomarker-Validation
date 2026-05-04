import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { AnalysisResults } from '../types';
import { getCancerType, SUBTYPE_META, COLOR_STYLES } from '../types';
import type { CancerType } from '../types';

interface SubtypeCardProps {
  results: AnalysisResults;
  forcedCancerType?: CancerType;
}

type SubtypeMeta = (typeof SUBTYPE_META)[keyof typeof SUBTYPE_META];

function getBarColor(name: string): string {
  const byKey = (SUBTYPE_META as Record<string, SubtypeMeta>)[name];
  if (byKey) return COLOR_STYLES[byKey.color].hex;

  const byLabel = (Object.values(SUBTYPE_META) as SubtypeMeta[]).find(
    (meta) => meta.label === name,
  );
  if (!byLabel) return '#6b7280';

  return COLOR_STYLES[byLabel.color].hex;
}

export default function SubtypeCard({ results, forcedCancerType }: SubtypeCardProps) {
  const topScore = results.subtypeScores.reduce<{ name: string; value: number } | null>(
    (best, current) => (best == null || current.value > best.value ? current : best),
    null,
  );
  const subtype    = (topScore?.name as keyof typeof SUBTYPE_META) ?? results.subtype;
  const meta       = SUBTYPE_META[subtype];
  const style      = COLOR_STYLES[meta?.color ?? 'cyan'];
  const cancerType = forcedCancerType ?? getCancerType(subtype);
  const confidencePercent =
    topScore?.value ?? (Number(results.confidence) <= 1 ? Number(results.confidence) * 100 : Number(results.confidence));

  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
        Subtype Prediction
      </h3>
      <p className="text-xs text-gray-600 mb-5 capitalize">{cancerType} cancer</p>

      <div className="flex flex-col sm:flex-row items-center gap-6">

        {/* Badge */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className={`px-8 py-5 rounded-2xl border-2 text-center ${style.border} ${style.bg}`}>
            <p className={`text-5xl font-black tracking-wider ${style.text}`}>
              {subtype}
            </p>
            <p className="text-xs text-gray-500 mt-1">{meta?.label ?? subtype}</p>
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
                width={60}
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
                  <Cell
                    key={entry.name}
                    fill={getBarColor(entry.name)}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}