import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { AnalysisResults } from '../types';

interface SubtypeCardProps {
  results: AnalysisResults;
}

const COLORS = { LUAD: '#22d3ee', LUSC: '#f97316' };

export default function SubtypeCard({ results }: SubtypeCardProps) {
  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Subtype Prediction</h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="flex flex-col items-center">
          <div className={`px-8 py-5 rounded-2xl border-2 text-center ${
            results.subtype === 'LUAD'
              ? 'border-cyan-500/50 bg-cyan-500/10'
              : 'border-orange-500/50 bg-orange-500/10'
          }`}>
            <p className={`text-5xl font-black tracking-wider ${
              results.subtype === 'LUAD' ? 'text-cyan-400' : 'text-orange-400'
            }`}>
              {results.subtype}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {results.subtype === 'LUAD' ? 'Lung Adenocarcinoma' : 'Lung Squamous Cell Carcinoma'}
            </p>
          </div>
          <div className="mt-4 text-center">
            <p className="text-3xl font-bold text-gray-100">{(results.confidence * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Confidence Score</p>
          </div>
        </div>

        <div className="flex-1 w-full" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={results.subtypeScores} layout="vertical" margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 600 }} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Score']}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
                {results.subtypeScores.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
