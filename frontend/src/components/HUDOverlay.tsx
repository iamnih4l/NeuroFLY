import { useState, useEffect } from 'react';

interface Metric {
  epoch: number;
  active_kcs: number;
  pam_hz: number;
  ppl1_hz: number;
  avg_weight: number;
}

interface HUDProps {
  experimentId: string;
  currentEpoch: number;
  status: any;
  isBlocked: boolean;
  errorMessage?: string | null;
  visualMode: 'WEB' | 'LOCAL';
}

export default function HUDOverlay({ experimentId, currentEpoch, status, isBlocked, errorMessage, visualMode }: HUDProps) {
  const [metric, setMetric] = useState<Metric | null>(null);
  const [provenance, setProvenance] = useState<any>(null);

  useEffect(() => {
    if (isBlocked || !experimentId) return;
    // Fetch metrics for the current epoch
    fetch(`http://localhost:3001/api/metrics?experiment_id=${experimentId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const m = data.find(d => d.epoch === currentEpoch);
          if (m) setMetric(m);
        }
      })
      .catch(console.error);
  }, [experimentId, currentEpoch, isBlocked]);

  useEffect(() => {
    fetch('http://localhost:3001/api/provenance')
      .then(res => res.json())
      .then(data => setProvenance(data))
      .catch(console.error);
  }, []);

  if (isBlocked) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
        <div className="border border-red-900 bg-red-950/90 p-8 w-[600px] shadow-[0_0_50px_rgba(220,38,38,0.3)]">
          <h1 className="text-3xl font-bold tracking-widest text-red-500 mb-2">NEUROFLY</h1>
          <h2 className="text-xl text-white tracking-widest mb-6">CONNECTOME TEMPORARILY UNAVAILABLE</h2>
          
          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between border-b border-red-900/50 pb-2">
              <span className="text-gray-400">ERROR</span>
              <span className="text-red-400 font-bold uppercase">{status?.status?.replace(/_/g, ' ') || 'NETWORK ERROR'}</span>
            </div>
            <div className="flex justify-between border-b border-red-900/50 pb-2">
              <span className="text-gray-400">DETAILS</span>
              <span className="text-red-300 font-mono max-w-xs text-right truncate" title={errorMessage || 'Backend connection failed'}>
                {errorMessage || 'Backend connection failed'}
              </span>
            </div>
            <div className="flex justify-between border-b border-red-900/50 pb-2">
              <span className="text-gray-400">DATASET</span>
              <span className="text-gray-200">male-cns:v1.0</span>
            </div>
            <div className="flex justify-between border-b border-red-900/50 pb-2">
              <span className="text-gray-400">SCIENTIFIC EXECUTION</span>
              <span className="text-red-500 font-bold">BLOCKED</span>
            </div>
          </div>
          
          <p className="mt-6 text-gray-500 text-xs text-center uppercase tracking-widest">
            No fallback biological data loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      
      {/* Top Banner Warning for Development Fixture */}
      {provenance?.isFixture && (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white font-bold text-center py-1 tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.5)] z-50">
          ⚠ DATA SOURCE: DEVELOPMENT FIXTURE — NOT REAL BIOLOGICAL DATA — SCIENTIFIC EXPERIMENTS DISABLED ⚠
        </div>
      )}

      {/* Top Left: System Title & Telemetry */}
      <div className="mt-8 flex flex-col gap-6 pointer-events-auto w-80">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-cyan-400">NEUROFLY</h1>
          <p className="text-gray-400 text-sm mt-1 tracking-widest border-l-2 border-cyan-800 pl-2">
            RESEARCH INTERFACE V1.0
          </p>
        </div>

        {/* Experiment Telemetry */}
        {!provenance?.isFixture && metric && (
          <div className="bg-gray-900/80 backdrop-blur-sm border border-cyan-900/50 p-4">
            <h2 className="text-xs text-cyan-600 font-bold mb-3 tracking-widest">REAL-TIME METRICS</h2>
            <div className="space-y-4">
              <MetricRow label="EPOCH" value={currentEpoch} unit="" />
              <MetricRow label="ACTIVE KC" value={metric?.active_kcs || 0} unit="neurons" />
              <MetricRow label="PAM DRIVE" value={metric?.pam_hz?.toFixed(1) || '0.0'} unit="Hz" />
              <MetricRow label="PPL1 DRIVE" value={metric?.ppl1_hz?.toFixed(1) || '0.0'} unit="Hz" />
              <MetricRow label="MBON WT" value={metric?.avg_weight?.toFixed(4) || '1.0000'} unit="mV" highlight />
            </div>
          </div>
        )}
      </div>

      {/* Right Side: Global Evidence & Provenance Panel */}
      <div className="absolute right-6 top-6 w-96 mt-8 pointer-events-auto">
        <div className="bg-gray-900/90 border border-gray-700 backdrop-blur-md p-5 text-sm shadow-2xl">
          <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <h2 className="text-gray-300 font-bold tracking-widest">DATA CONTRACT</h2>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          
          <div className="space-y-3">
            <ProvRow label="SOURCE" value={provenance?.source_type || 'LOADING...'} />
            <ProvRow label="DATASET" value={provenance?.dataset_version || 'LOADING...'} />
            <ProvRow label="PROVENANCE" value={provenance?.data_provenance || 'LOADING...'} />
            
            <div className="h-px bg-gray-800 my-2"></div>
            
            <ProvRow 
              label="VISUALIZATION" 
              value={visualMode === 'WEB' ? 'WEB / API MODE (Targeted Subset)' : 'LOCAL / FULL DATA MODE (Complete CNS)'} 
              color={visualMode === 'WEB' ? 'text-cyan-400' : 'text-purple-400'}
            />
            <ProvRow 
              label="BIOLOGICAL" 
              value={provenance?.biological_status || 'LOADING...'} 
              color={provenance?.isFixture ? 'text-red-400' : 'text-green-400'}
            />
            <ProvRow label="SIMULATION" value={provenance?.simulation_status || 'LOADING...'} />
            <ProvRow label="CONFIDENCE" value={provenance?.confidence || 'LOADING...'} color="text-yellow-400" />
            
            <div className="h-px bg-gray-800 my-2"></div>
            <div className="text-xs">
              <span className="text-gray-500 block mb-1">MODEL ASSUMPTIONS</span>
              <span className="text-gray-300 italic">{provenance?.assumptions || 'LOADING...'}</span>
            </div>
            
            <div className="h-px bg-gray-800 my-2"></div>
            <ProvRow 
              label="DATA STATUS" 
              value={visualMode === 'LOCAL' ? 'OFFLINE (LOCAL MODE)' : (status?.DATA_READY || 'LOADING...')} 
              color={visualMode === 'LOCAL' ? 'text-gray-500' : (status?.DATA_READY === 'READY' ? 'text-green-400' : 'text-red-400')}
            />
            <ProvRow 
              label="MODEL STATUS" 
              value={visualMode === 'LOCAL' ? 'OFFLINE (LOCAL MODE)' : (status?.MODEL_READY || 'LOADING...')} 
              color={visualMode === 'LOCAL' ? 'text-gray-500' : (status?.MODEL_READY === 'READY' ? 'text-green-400' : 'text-red-400')}
            />
            <ProvRow 
              label="EXPERIMENT STATUS" 
              value={visualMode === 'LOCAL' ? 'OFFLINE (LOCAL MODE)' : (status?.EXPERIMENT_READY || 'LOADING...')} 
              color={visualMode === 'LOCAL' ? 'text-gray-500' : (status?.EXPERIMENT_READY === 'READY' ? 'text-green-400' : 'text-red-400')}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

function MetricRow({ label, value, unit, highlight = false }: { label: string, value: string | number, unit: string, highlight?: boolean }) {
  return (
    <div className="flex justify-between items-end">
      <span className="text-gray-500 text-xs tracking-wider">{label}</span>
      <div className="text-right">
        <span className={`font-mono text-xl ${highlight ? 'text-green-400' : 'text-gray-200'}`}>
          {value}
        </span>
        <span className="text-gray-600 text-xs ml-1">{unit}</span>
      </div>
    </div>
  );
}

function ProvRow({ label, value, color = 'text-white' }: { label: string, value: string, color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-gray-500 text-[10px] tracking-widest uppercase">{label}</span>
      <span className={`font-mono text-xs truncate ${color}`} title={value}>{value}</span>
    </div>
  );
}
