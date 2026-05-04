export type Subtype = 'LUAD' | 'LUSC' | 'COAD' | 'READ';
export type CancerType = 'lung' | 'colorectal';
export type AnalysisStatus = 'pending' | 'running' | 'complete' | 'error';

export interface DriverGene {
  index: number;
  symbol: string;
  shap: number;
  lime: number;
  confidence: number;
  direction: 'up' | 'down';
}

export interface DrugCandidate {
  gene: string;
  drug: string;
  mechanism: string;
  phase: string;
  chemblId: string;
}

export interface AgentSection {
  title: string;
  content: string;
}

export interface GeneAgentReport {
  gene: string;
  sections: AgentSection[];
}

export interface AnalysisResults {
  subtype: Subtype;
  confidence: number;
  subtypeScores: { name: string; value: number }[];
  driverGenes: DriverGene[];
  drugCandidates: DrugCandidate[];
  agentReports: GeneAgentReport[];
  summary: {
    patientId: string;
    subtype: Subtype;
    topGenes: string[];
    topDrugs: string[];
    aggregatorSummary: string;
  };
}

export interface Analysis {
  id: string;
  patient_id: string;
  predicted_subtype?: Subtype | null;
  /** @deprecated use subtypeScores on results instead */
  luad_confidence?: number | null;
  /** @deprecated use subtypeScores on results instead */
  lusc_confidence?: number | null;
  status: AnalysisStatus;
  current_step: string;
  current_step_number?: number;
  results: AnalysisResults | null;
  created_at: string;
  completed_at?: string | null;
}

export const PIPELINE_STEPS = [
  'Parse CSV',
  'Classify Subtype',
  'XAI Analysis',
  'Map Gene Symbols',
  'Drug Repurposing',
  'Multi-Agent RAG',
  'Generate Report',
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getCancerType(subtype: string): CancerType {
  return subtype === 'COAD' || subtype === 'READ' ? 'colorectal' : 'lung';
}

export const SUBTYPE_META: Record<
  Subtype,
  { label: string; color: 'cyan' | 'orange' | 'violet' | 'rose' }
> = {
  LUAD: { label: 'Lung Adenocarcinoma',          color: 'cyan'   },
  LUSC: { label: 'Lung Squamous Cell Carcinoma', color: 'orange' },
  COAD: { label: 'Colon Adenocarcinoma',         color: 'violet' },
  READ: { label: 'Rectal Adenocarcinoma',        color: 'rose'   },
};

export const COLOR_STYLES: Record<
  'cyan' | 'orange' | 'violet' | 'rose',
  { border: string; bg: string; text: string; hex: string; dimBg: string; dimBorder: string }
> = {
  cyan: {
    border:    'border-cyan-500/50',
    bg:        'bg-cyan-500/10',
    text:      'text-cyan-400',
    hex:       '#22d3ee',
    dimBg:     'rgba(0,188,212,0.12)',
    dimBorder: 'rgba(0,188,212,0.35)',
  },
  orange: {
    border:    'border-orange-500/50',
    bg:        'bg-orange-500/10',
    text:      'text-orange-400',
    hex:       '#f97316',
    dimBg:     'rgba(249,115,22,0.12)',
    dimBorder: 'rgba(249,115,22,0.35)',
  },
  violet: {
    border:    'border-violet-500/50',
    bg:        'bg-violet-500/10',
    text:      'text-violet-400',
    hex:       '#a78bfa',
    dimBg:     'rgba(167,139,250,0.12)',
    dimBorder: 'rgba(167,139,250,0.35)',
  },
  rose: {
    border:    'border-rose-500/50',
    bg:        'bg-rose-500/10',
    text:      'text-rose-400',
    hex:       '#fb7185',
    dimBg:     'rgba(251,113,133,0.12)',
    dimBorder: 'rgba(251,113,133,0.35)',
  },
};

export const CANCER_LABELS: Record<
  CancerType,
  { reportTitle: string; footerLabel: string; accentHex: string; accentRgb: [number, number, number] }
> = {
  lung: {
    reportTitle: 'Lung Cancer Biomarker Analysis',
    footerLabel: 'Lung Cancer Biomarker Report',
    accentHex:   '#00bcd4',
    accentRgb:   [0, 188, 212],
  },
  colorectal: {
    reportTitle: 'Colorectal Cancer Biomarker Analysis',
    footerLabel: 'Colorectal Cancer Biomarker Report',
    accentHex:   '#a78bfa',
    accentRgb:   [167, 139, 250],
  },
};