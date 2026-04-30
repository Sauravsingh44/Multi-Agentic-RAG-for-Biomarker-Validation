export type Subtype = 'LUAD' | 'LUSC';
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
  luad_confidence?: number | null;
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
