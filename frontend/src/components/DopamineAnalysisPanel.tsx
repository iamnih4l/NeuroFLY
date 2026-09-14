import { useEffect, useState } from 'react';

export default function DopamineAnalysisPanel() {
  const [neurons, setNeurons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [circuit, setCircuit] = useState<any>(null);
  const [circuitLoading, setCircuitLoading] = useState(false);
  const [experimentLoading, setExperimentLoading] = useState(false);
  const [experimentResult, setExperimentResult] = useState<any>(null);

  useEffect(() => {
    const fetchNeurons = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/analysis/dopaminergic-neurons?limit=50');
        const data = await res.json();
        if (Array.isArray(data)) setNeurons(data);
      } catch (err) {
        console.error("Failed to fetch dopaminergic neurons:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNeurons();
  }, []);

  const loadCircuit = async (bodyId: string) => {
    setSelectedBodyId(bodyId);
    setCircuitLoading(true);
    setCircuit(null);
    setExperimentResult(null);
    try {
      const res = await fetch(`http://localhost:3001/api/analysis/circuit/${bodyId}`);
      const data = await res.json();
      setCircuit(data);
    } catch (err) {
      console.error("Failed to fetch circuit:", err);
    } finally {
      setCircuitLoading(false);
    }
  };

  const runExperiment = async () => {
    if (!selectedBodyId) return;
    setExperimentLoading(true);
    try {
      // In a real implementation we would hit an endpoint that runs the experiment
      // For now, let's pretend we hit /api/analysis/experiment/:bodyId
      const res = await fetch(`http://localhost:3001/api/analysis/experiment/${selectedBodyId}`, { method: 'POST' });
      const data = await res.json();
      setExperimentResult(data);
    } catch (err) {
      console.error("Failed to run experiment:", err);
    } finally {
      setExperimentLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="absolute right-6 top-24 bottom-6 z-40 pointer-events-auto flex flex-col gap-4 w-96">
      
      {/* List Panel */}
      <div className="border border-purple-800 bg-purple-950/90 p-4 font-mono text-xs shadow-[0_0_20px_rgba(168,85,247,0.2)] flex-shrink-0 max-h-64 overflow-y-auto custom-scrollbar">
        <h3 className="text-purple-400 font-bold mb-2 tracking-widest border-b border-purple-800/50 pb-1 sticky top-0 bg-purple-950/90 pt-1">
          DOPAMINERGIC NEURONS (Sample)
        </h3>
        
        <div className="space-y-1">
          {neurons.map(n => (
            <button 
              key={n.body_id}
              onClick={() => loadCircuit(n.body_id)}
              className={`w-full text-left p-1 text-[10px] hover:bg-purple-900/50 transition flex justify-between ${selectedBodyId === n.body_id ? 'bg-purple-900/80 text-white border border-purple-500' : 'text-purple-200'}`}
            >
              <span>{n.body_id}</span>
              <span className="opacity-70">{n.neuron_type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Circuit Info Panel */}
      {selectedBodyId && (
        <div className="border border-purple-800 bg-purple-950/90 p-4 font-mono text-xs shadow-[0_0_20px_rgba(168,85,247,0.2)] flex-1 overflow-y-auto custom-scrollbar">
          <h3 className="text-purple-400 font-bold mb-2 tracking-widest border-b border-purple-800/50 pb-1">
            CIRCUIT ANALYSIS: {selectedBodyId}
          </h3>
          
          {circuitLoading ? (
            <div className="text-purple-300 animate-pulse mt-4">Extracting real circuit from NeuPrint...</div>
          ) : circuit ? (
            <div className="space-y-4 text-purple-200">
              <div className="bg-purple-900/30 p-2 border border-purple-900/50">
                <span className="text-purple-500 block text-[9px] tracking-widest mb-1">PROVENANCE (OBSERVED)</span>
                <div className="flex justify-between"><span>Dataset:</span> <span className="text-white">{circuit.provenance?.dataset || 'male-cns:v1.0'}</span></div>
                <div className="flex justify-between"><span>Source:</span> <span className="text-white">NeuPrint API</span></div>
              </div>
              
              <div className="bg-purple-900/30 p-2 border border-purple-900/50">
                <span className="text-purple-500 block text-[9px] tracking-widest mb-1">METRICS (DERIVED)</span>
                <div className="flex justify-between"><span>Total Nodes:</span> <span className="text-white font-bold">{circuit.metrics?.node_count}</span></div>
                <div className="flex justify-between"><span>Total Edges:</span> <span className="text-white font-bold">{circuit.metrics?.edge_count}</span></div>
                <div className="flex justify-between"><span>In-Degree:</span> <span className="text-white">{circuit.metrics?.in_degree}</span></div>
                <div className="flex justify-between"><span>Out-Degree:</span> <span className="text-white">{circuit.metrics?.out_degree}</span></div>
                <div className="flex justify-between"><span>Reciprocal:</span> <span className="text-white">{circuit.metrics?.reciprocal_connections}</span></div>
              </div>
              
              <button 
                onClick={runExperiment}
                disabled={experimentLoading}
                className="w-full bg-cyan-900/30 border border-cyan-800 hover:bg-cyan-800/50 text-cyan-400 p-2 text-center tracking-widest font-bold transition disabled:opacity-50"
              >
                {experimentLoading ? 'RUNNING CALIBRATION SWEEP...' : 'RUN EXPERIMENTAL CALIBRATION'}
              </button>
              
              {experimentResult && (
                <div className="bg-cyan-950/80 p-2 border border-cyan-800 mt-4 text-[10px]">
                  <span className="text-cyan-500 block text-[9px] tracking-widest mb-2 border-b border-cyan-900 pb-1">
                    MODEL ASSUMPTIONS & LIMITATIONS
                  </span>
                  <ul className="list-disc pl-4 mb-4 text-cyan-300 space-y-1">
                    {experimentResult.assumptions?.map((a: string, i: number) => <li key={i}>{a}</li>)}
                    {experimentResult.limitations?.map((l: string, i: number) => <li key={`l-${i}`} className="text-red-400/80">{l}</li>)}
                  </ul>

                  <span className="text-cyan-500 block text-[9px] tracking-widest mb-2 border-b border-cyan-900 pb-1">
                    CALIBRATION SWEEP RESULTS
                  </span>
                  
                  <div className="space-y-2">
                    {experimentResult.conditions?.map((c: any, i: number) => {
                      const m = c.metrics;
                      return (
                        <div key={i} className="bg-cyan-900/20 p-2 border border-cyan-900/50">
                          <div className="flex justify-between font-bold text-white mb-1">
                            <span>{c.condition}</span>
                            <span className="text-cyan-300">{c.modulation_mv} mV</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 text-[9px] text-cyan-200">
                            <div className="flex justify-between"><span>Baseline Spikes:</span> <span>{m.spikes_baseline}</span></div>
                            <div className="flex justify-between"><span>Stimulus Spikes:</span> <span>{m.spikes_stimulus}</span></div>
                            <div className="flex justify-between"><span>Post Spikes:</span> <span>{m.spikes_post}</span></div>
                            <div className="flex justify-between"><span>Total Spikes:</span> <span>{m.total_spikes}</span></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-2 text-cyan-400 italic text-[9px]">
                    Interpretation: {experimentResult.interpretation}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-400 mt-4">Circuit data unavailable.</div>
          )}
        </div>
      )}
    </div>
  );
}
