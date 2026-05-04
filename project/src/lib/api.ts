const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

type ApiResponse<T = unknown> = {
  data?: T;
  error?: string;
  status?: string;
  current_step?: string;
  current_step_number?: number;
  total_steps?: number;
  analysis?: unknown;
};

type AnalysisResult = Record<string, unknown>;

type RecentAnalysis = AnalysisResult[];
type DashboardSummary = {
  analyses_run: number;
  genes_profiled: number;
  drug_candidates: number;
  avg_pipeline_minutes: number | null;
};

function normalizeStatus(status?: string) {
  const value = (status || '').toLowerCase();
  if (value === 'failed') return 'error';
  if (value === 'complete') return 'complete';
  if (value === 'running') return 'running';
  return 'pending';
}

function normalizeAnalysisPayload(payload: Record<string, unknown>) {
  const normalizedResults = normalizeResults(payload.results as Record<string, unknown> | undefined);
  return {
    ...payload,
    status: normalizeStatus(payload.status as string | undefined),
    // Backend can return empty object for unfinished analyses.
    results: normalizedResults,
  };
}

function canonicalSubtype(value: unknown): 'LUAD' | 'LUSC' | 'COAD' | 'READ' | null {
  if (value == null) return null;
  const key = String(value).trim().toUpperCase();
  const map: Record<string, 'LUAD' | 'LUSC' | 'COAD' | 'READ'> = {
    LUAD: 'LUAD',
    LUSC: 'LUSC',
    COAD: 'COAD',
    READ: 'READ',
    'LUNG ADENOCARCINOMA': 'LUAD',
    'LUNG SQUAMOUS CELL CARCINOMA': 'LUSC',
    'COLON ADENOCARCINOMA': 'COAD',
    'RECTAL ADENOCARCINOMA': 'READ',
  };
  return map[key] ?? null;
}

function normalizeScore(value: unknown): number {
  const raw = typeof value === 'string' ? value.replace('%', '').trim() : value;
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return num <= 1 ? num * 100 : num;
}

function normalizeResults(results?: Record<string, unknown> | null) {
  if (!results || Object.keys(results).length === 0) return null;

  const scores = Array.isArray(results.subtypeScores)
    ? (results.subtypeScores as Array<{ name?: unknown; value?: unknown }>).map((s) => ({
        name: canonicalSubtype(s.name) ?? String(s.name ?? ''),
        value: normalizeScore(s.value),
      }))
    : [];

  const winner = scores.reduce<{ name: string; value: number } | null>(
    (best, current) => (best == null || current.value > best.value ? current : best),
    null
  );
  // Always trust the highest score when score rows are present.
  const normalizedSubtype = canonicalSubtype(winner?.name) ?? canonicalSubtype(results.subtype) ?? 'LUAD';
  const normalizedConfidence = winner ? winner.value : normalizeScore(results.confidence);

  const normalizedSummary =
    results.summary && typeof results.summary === 'object'
      ? {
          ...(results.summary as Record<string, unknown>),
          subtype: normalizedSubtype,
        }
      : results.summary;

  return {
    ...results,
    subtype: normalizedSubtype,
    confidence: normalizedConfidence,
    subtypeScores: scores,
    summary: normalizedSummary,
  };
}

export const api = {
  async analyze(file: File, classifierType: 'lung' | 'colorectal' = 'lung'): Promise<{analysis_id: string}> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('classifier_type', classifierType);
    
    const res = await fetch(`${API_BASE}/pipeline/analyze/`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`);
    }
    return { analysis_id: (data as { id?: string; analysis_id?: string }).id || (data as { analysis_id?: string }).analysis_id || '' };
  },

  async status(analysisId: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE}/pipeline/analysis/${analysisId}/status/`);
    if (!res.ok) throw new Error('Status fetch failed');
    const data = await res.json();
    return {
      ...data,
      status: normalizeStatus(data.status),
      analysis: data.analysis ? normalizeAnalysisPayload(data.analysis) : null,
    };
  },

  async results(analysisId: string): Promise<AnalysisResult> {
    const res = await fetch(`${API_BASE}/pipeline/analysis/${analysisId}/`);
    if (!res.ok) throw new Error('Results fetch failed');
    const data = await res.json();
    return normalizeAnalysisPayload(data);
  },

  async recent(): Promise<RecentAnalysis> {
    const res = await fetch(`${API_BASE}/pipeline/analyses/`);
    if (!res.ok) throw new Error('Recent fetch failed');
    const data = await res.json();
    return data.map((item: Record<string, unknown>) => normalizeAnalysisPayload(item));
  },

  async clearRecent(): Promise<{ deleted: number }> {
    const res = await fetch(`${API_BASE}/pipeline/analyses/clear/`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Clear analyses failed');
    return await res.json();
  },

  async summary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/pipeline/analyses/summary/`);
    if (!res.ok) throw new Error('Summary fetch failed');
    const data = (await res.json()) as Partial<DashboardSummary>;
    return {
      analyses_run: Number(data.analyses_run || 0),
      genes_profiled: Number(data.genes_profiled || 0),
      drug_candidates: Number(data.drug_candidates || 0),
      avg_pipeline_minutes:
        data.avg_pipeline_minutes == null ? null : Number(data.avg_pipeline_minutes),
    };
  },
};
