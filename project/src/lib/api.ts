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

function normalizeStatus(status?: string) {
  const value = (status || '').toLowerCase();
  if (value === 'failed') return 'error';
  if (value === 'complete') return 'complete';
  if (value === 'running') return 'running';
  return 'pending';
}

function normalizeAnalysisPayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    status: normalizeStatus(payload.status as string | undefined),
    // Backend can return empty object for unfinished analyses.
    results:
      payload.results && Object.keys(payload.results as Record<string, unknown>).length > 0
        ? payload.results
        : null,
  };
}

export const api = {
  async analyze(file: File): Promise<{analysis_id: string}> {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_BASE}/pipeline/analyze/`, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return { analysis_id: data.id };
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
};
