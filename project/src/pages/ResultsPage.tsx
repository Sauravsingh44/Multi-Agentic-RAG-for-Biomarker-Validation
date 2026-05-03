import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import PipelineProgress from '../components/PipelineProgress';
import SubtypeCard from '../components/SubtypeCard';
import DriverGenesTable from '../components/DriverGenesTable';
import DrugCandidatesTable from '../components/DrugCandidatesTable';
import AgentReports from '../components/AgentReports';
import SummaryReport from '../components/SummaryReport';
import { api } from '../lib/api';
import type { Analysis } from '../types';

function usePollPipeline(id: string) {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('running');

  useEffect(() => {
    if (!id || !id.trim()) {
      setCurrentStep(0);
      setStatus('running');
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await api.status(id);
        if (res.status === 'complete' || res.status === 'error') {
          clearInterval(interval);
        }
        setCurrentStep(res.current_step_number || 0);
        setStatus(res.status || 'running');
      } catch {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id]);

  return { currentStep, status };
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const { currentStep: simStep, status: simStatus } = usePollPipeline(id ?? '');

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const pollInterval = window.setInterval(async () => {
      try {
        const res = await api.status(id);
        if (cancelled) return;

        setAnalysis(res.analysis as Analysis | null);

        if (res.status === 'error' || res.status === 'complete') {
          window.clearInterval(pollInterval);
        }

        if (res.status === 'complete') {
          const fullRes = await api.results(id);
          setAnalysis(fullRes as unknown as Analysis);
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(pollInterval);
    };
  }, [id]);

  const currentStep = analysis?.status === 'complete' ? 7 : simStep;
  const currentStatus = analysis?.status === 'complete' ? 'complete' : simStatus;
  const isComplete = currentStatus === 'complete';
  const isError = currentStatus === 'error';
  const results = analysis?.results ?? null;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Analysis Results</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-100">
            Patient <span className="font-mono text-cyan-400">{analysis?.patient_id || 'Unknown'}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isComplete ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle2 size={12} />
              Analysis Complete
            </span>
          ) : isError ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              <AlertCircle size={12} />
              Pipeline Failed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Pipeline Running
            </span>
          )}
        </div>
      </div>

      {/* Section 1: Pipeline Progress */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Pipeline Progress</h2>
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">{Math.min(currentStep, 7)}/7 steps</span>
        </div>
        <div className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm p-6">
          <PipelineProgress currentStep={currentStep} status={currentStatus} />
        </div>
      </section>

      {/* Section 2: Live Results */}
      {results && (
        <section className="space-y-8">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Live Results</h2>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <SubtypeCard results={results} />
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm p-6 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Analysis Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Driver Genes</p>
                      <p className="text-2xl font-bold text-gray-100">{results.driverGenes.length}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Drug Candidates</p>
                      <p className="text-2xl font-bold text-gray-100">{results.drugCandidates.length}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Agent Reports</p>
                      <p className="text-2xl font-bold text-gray-100">{results.agentReports.length}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Confidence</p>
                      <p className="text-2xl font-bold text-cyan-400">{(results.confidence * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DriverGenesTable genes={results.driverGenes} />
          <DrugCandidatesTable drugs={results.drugCandidates} />
          <AgentReports reports={results.agentReports} />
        </section>
      )}

      {/* Section 3: Final Summary */}
      {isComplete && results && (
        <section>
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Final Summary Report</h2>
            <div className="flex-1 h-px bg-gray-800" />
          </div>
          <SummaryReport results={results} />
        </section>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-400 mt-0.5" size={18} />
            <div>
              <p className="text-gray-200 font-semibold">Pipeline failed</p>
              <p className="text-gray-500 text-sm mt-1">
                {(analysis as unknown as { error_message?: string })?.error_message || 'Unknown error.'}
              </p>
              <p className="text-gray-600 text-xs mt-3">
                If you're stuck on "Classify Subtype", it usually means the remote subtype model is slow/unreachable. Try again in a minute, or run the backend with network access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Waiting state */}
      {!isComplete && !isError && !results && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Pipeline is processing...</p>
          <p className="text-gray-600 text-sm mt-1">Results will appear here as each step completes</p>
        </div>
      )}
    </div>
  );
}