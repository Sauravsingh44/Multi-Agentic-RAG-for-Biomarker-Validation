import { Check, Loader2 } from 'lucide-react';
import { PIPELINE_STEPS } from '../types';

type StepStatus = 'pending' | 'running' | 'complete';

interface PipelineProgressProps {
  currentStep: number;
  status: string;
}

function getStepStatus(stepIndex: number, currentStep: number, overallStatus: string): StepStatus {
  if (overallStatus === 'complete' || stepIndex < currentStep) return 'complete';
  if (stepIndex === currentStep && overallStatus === 'running') return 'running';
  return 'pending';
}

const stepColors = {
  pending: 'border-gray-700 bg-gray-800/50 text-gray-500',
  running: 'border-blue-500 bg-blue-500/10 text-blue-400',
  complete: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
};

const labelColors = {
  pending: 'text-gray-500',
  running: 'text-blue-400',
  complete: 'text-emerald-400',
};

const connectorColors = {
  pending: 'bg-gray-800',
  running: 'bg-gray-800',
  complete: 'bg-emerald-500/40',
};

export default function PipelineProgress({ currentStep, status }: PipelineProgressProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-start min-w-max mx-auto px-4" style={{ gap: 0 }}>
        {PIPELINE_STEPS.map((step, i) => {
          const stepStatus = getStepStatus(i, currentStep, status);
          const isLast = i === PIPELINE_STEPS.length - 1;

          return (
            <div key={step} className="flex items-start">
              <div className="flex flex-col items-center" style={{ width: 88 }}>
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${stepColors[stepStatus]}`}>
                  {stepStatus === 'complete' ? (
                    <Check size={16} />
                  ) : stepStatus === 'running' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span className="text-xs font-semibold">{i + 1}</span>
                  )}
                </div>
                <p className={`text-xs text-center mt-2 leading-tight font-medium transition-colors duration-300 ${labelColors[stepStatus]}`} style={{ width: 72 }}>
                  {step}
                </p>
              </div>
              {!isLast && (
                <div className="flex items-center mt-5" style={{ width: 32 }}>
                  <div className={`h-0.5 w-full transition-colors duration-500 ${connectorColors[stepStatus]}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
