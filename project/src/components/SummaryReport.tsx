import { Download, User, Dna, Pill, ClipboardList } from 'lucide-react';
import type { AnalysisResults } from '../types';

interface SummaryReportProps {
  results: AnalysisResults;
}

export default function SummaryReport({ results }: SummaryReportProps) {
  const { summary } = results;

  const handleDownload = () => {
    const text = `
LUNG CANCER GENE ANALYSIS PIPELINE - CLINICAL REPORT
=====================================================
Patient ID:         ${summary.patientId}
Predicted Subtype:  ${summary.subtype} (${(results.confidence * 100).toFixed(1)}% confidence)

TOP DRIVER GENES
----------------
${summary.topGenes.join(', ')}

TOP DRUG CANDIDATES
-------------------
${summary.topDrugs.join(', ')}

CLINICAL RECOMMENDATIONS
-------------------------
${summary.clinicalRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Generated: ${new Date().toISOString()}
`.trim();

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${summary.patientId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Final Summary Report</h3>
          <p className="text-xs text-gray-600 mt-0.5">Pipeline analysis complete</p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
        >
          <Download size={14} />
          Download Report
        </button>
      </div>

      <div className="p-6 grid sm:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
              <User size={14} className="text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Patient ID</p>
              <p className="text-gray-100 font-mono font-semibold">{summary.patientId}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Dna size={14} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Predicted Subtype</p>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-black text-2xl">{summary.subtype}</span>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                  {(results.confidence * 100).toFixed(1)}% confidence
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Dna size={14} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Top Driver Genes</p>
              <div className="flex flex-wrap gap-1.5">
                {summary.topGenes.map((gene) => (
                  <span key={gene} className="text-xs font-semibold font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {gene}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Pill size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Top Drug Candidates</p>
              <div className="flex flex-wrap gap-1.5">
                {summary.topDrugs.map((drug) => (
                  <span key={drug} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {drug}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ClipboardList size={14} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Clinical Recommendations</p>
            <ol className="space-y-2">
              {summary.clinicalRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-xs flex items-center justify-center flex-shrink-0 font-semibold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-400 leading-relaxed">{rec}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
