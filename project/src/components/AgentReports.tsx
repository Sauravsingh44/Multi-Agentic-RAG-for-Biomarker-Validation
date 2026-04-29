import { useState } from 'react';
import { ChevronDown, ChevronUp, Bot, GitBranch, Pill, BookOpen, Layers } from 'lucide-react';
import type { GeneAgentReport } from '../types';

interface AgentReportsProps {
  reports: GeneAgentReport[];
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'Gene Agent': <Bot size={14} />,
  'Pathway Agent': <GitBranch size={14} />,
  'Drug Agent': <Pill size={14} />,
  'Literature Agent': <BookOpen size={14} />,
  'Aggregator': <Layers size={14} />,
};

const SECTION_COLORS: Record<string, string> = {
  'Gene Agent': 'text-cyan-400',
  'Pathway Agent': 'text-emerald-400',
  'Drug Agent': 'text-amber-400',
  'Literature Agent': 'text-blue-400',
  'Aggregator': 'text-pink-400',
};

function GeneCard({ report }: { report: GeneAgentReport }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (title: string) => {
    setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <span className="text-cyan-400 font-bold text-xs">{report.gene.slice(0, 2)}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-100">{report.gene}</p>
          <p className="text-xs text-gray-500">{report.sections.length} agent analyses</p>
        </div>
      </div>
      <div className="divide-y divide-gray-800/40">
        {report.sections.map((section) => {
          const isOpen = expanded[section.title] ?? false;
          return (
            <div key={section.title}>
              <button
                onClick={() => toggle(section.title)}
                className="w-full px-6 py-3.5 flex items-center justify-between hover:bg-gray-800/30 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className={SECTION_COLORS[section.title] || 'text-gray-400'}>
                    {SECTION_ICONS[section.title]}
                  </span>
                  <span className="text-sm font-medium text-gray-300">{section.title}</span>
                </div>
                {isOpen ? (
                  <ChevronUp size={14} className="text-gray-500" />
                ) : (
                  <ChevronDown size={14} className="text-gray-500" />
                )}
              </button>
              {isOpen && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-gray-400 leading-relaxed">{section.content}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AgentReports({ reports }: AgentReportsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Agent Reports</h3>
        <span className="text-xs text-gray-600">{reports.length} genes analyzed</span>
      </div>
      <div className="grid gap-4">
        {reports.map((report) => (
          <GeneCard key={report.gene} report={report} />
        ))}
      </div>
    </div>
  );
}
