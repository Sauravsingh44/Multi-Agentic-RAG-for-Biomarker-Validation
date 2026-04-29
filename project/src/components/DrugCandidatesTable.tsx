import { ExternalLink, Pill } from 'lucide-react';
import type { DrugCandidate } from '../types';

interface DrugCandidatesTableProps {
  drugs: DrugCandidate[];
}

const GENE_COLORS: Record<string, string> = {
  EGFR: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  KRAS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  MET: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  ALK: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  BRAF: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  TP53: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function DrugCandidatesTable({ drugs }: DrugCandidatesTableProps) {
  const grouped = drugs.reduce<Record<string, DrugCandidate[]>>((acc, d) => {
    (acc[d.gene] = acc[d.gene] || []).push(d);
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Drug Candidates</h3>
        <p className="text-xs text-gray-600 mt-0.5">Grouped by target gene</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800/60">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gene</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Drug</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mechanism</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ChEMBL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {Object.entries(grouped).map(([gene, geneDrugs]) =>
              geneDrugs.map((drug, i) => (
                <tr key={`${gene}-${drug.drug}`} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-3.5">
                    {i === 0 && (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${GENE_COLORS[gene] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                        <Pill size={10} />
                        {gene}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-200">{drug.drug}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">{drug.mechanism}</td>
                  <td className="px-6 py-3.5">
                    <a
                      href={`https://www.ebi.ac.uk/chembl/compound_report_card/${drug.chemblId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                    >
                      {drug.chemblId}
                      <ExternalLink size={10} />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
