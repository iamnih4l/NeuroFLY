import { useState, useEffect } from 'react';

export function ResearchExperimentInterface({ onSimulate, activeData, ablatingTarget }: { onSimulate?: any, activeData?: any, ablatingTarget?: any }) {
  console.log(activeData, ablatingTarget);
  const [cohort, setCohort] = useState<any[]>([]);
  const [selectedCircuit, setSelectedCircuit] = useState<string | null>(null);
  const [loadingCohort, setLoadingCohort] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    fetch('/api/research/cohort')
      .then(r => r.json())
      .then(data => {
        setCohort(data);
        setLoadingCohort(false);
        if (data.length > 0) setSelectedCircuit(data[0].body_id);
      })
      .catch(e => {
        console.error(e);
        setLoadingCohort(false);
      });
  }, []);

  const handleRun = async () => {
    if (!selectedCircuit) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/research/run/${selectedCircuit}?replicates=10`, { method: 'POST' });
      const data = await res.json();
      setResults(data);
      if (onSimulate) {
        onSimulate(data, selectedCircuit);
      }
    } catch (e) {
      console.error(e);
    }
    setRunning(false);
  };

  return (
    <div className="absolute left-6 top-24 bottom-6 z-40 pointer-events-auto flex flex-col gap-4 w-[450px] font-mono text-xs overflow-y-auto custom-scrollbar shadow-2xl">
      <div className="bg-gray-950/95 border border-cyan-800 p-4">
        <h2 className="text-cyan-400 font-bold mb-2 tracking-widest text-lg border-b border-cyan-900 pb-2">
          NEUROFLY RESEARCH ENVIRONMENT
        </h2>
        <span className="bg-red-900/50 text-red-400 px-2 py-1 border border-red-800 rounded font-bold mb-4 inline-block">
          COMPUTATIONAL EXPERIMENT MODE
        </span>

        <div className="mb-4">
          <span className="bg-cyan-900/50 text-cyan-300 px-2 py-0.5 border border-cyan-800 text-[10px]">QUESTION</span>
          <p className="text-gray-300 mt-2 leading-relaxed">
            How does a structurally defined dopaminergic circuit respond to controlled changes in modeled neuromodulatory excitability, and which structural properties of the circuit are associated with the resulting change in simulated activity?
          </p>
        </div>

        <div className="mb-4">
          <span className="bg-cyan-900/50 text-cyan-300 px-2 py-0.5 border border-cyan-800 text-[10px]">HYPOTHESIS</span>
          <div className="text-gray-300 mt-2 space-y-2">
            <p><strong className="text-gray-100">H0:</strong> Changing the modeled dopaminergic modulation parameter produces no systematic change in the measured activity of the selected circuit.</p>
            <p><strong className="text-gray-100">H1:</strong> Changing the modeled dopaminergic modulation parameter produces a measurable change in the simulated activity of the selected circuit.</p>
          </div>
        </div>

        <div className="mb-4 bg-gray-900/50 p-3 border border-gray-800">
          <span className="bg-green-900/50 text-green-400 px-2 py-0.5 border border-green-800 text-[10px]">OBSERVED STRUCTURE</span>
          <h3 className="mt-2 text-gray-200 font-bold">Circuit Cohort Selection</h3>
          <p className="text-gray-500 text-[10px] mb-2">Authoritative dopaminergic neurons (Ranked by weight, degree &gt; 5)</p>
          
          {loadingCohort ? (
            <div className="text-cyan-500 animate-pulse">Loading cohort...</div>
          ) : (
            <select 
              className="w-full bg-black text-gray-200 border border-gray-700 p-2 outline-none focus:border-cyan-500" 
              value={selectedCircuit || ''} 
              onChange={e => setSelectedCircuit(e.target.value)}
            >
              {cohort.map(c => (
                <option key={c.body_id} value={c.body_id}>
                  {c.body_id} ({c.neuron_type}) - Out Degree: {c.out_degree}, W: {c.total_weight}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-4 bg-gray-900/50 p-3 border border-gray-800">
          <span className="bg-yellow-900/50 text-yellow-500 px-2 py-0.5 border border-yellow-800 text-[10px]">ASSUMED DYNAMICS</span>
          <h3 className="mt-2 text-gray-200 font-bold mb-2">Experiment Setup</h3>
          <ul className="text-gray-400 space-y-1 list-disc pl-4">
            <li><strong>Dataset:</strong> male-cns:v1.0 (Real)</li>
            <li><strong>Replicates:</strong> N=10 stochastic seeds per condition</li>
            <li><strong>Baseline Control:</strong> 0.0 mV Modulation</li>
            <li><strong>Perturbation A (Sweep):</strong> [0.5, 1.0, 2.0, 5.0] mV offset</li>
            <li><strong>Perturbation B (Ablation):</strong> Computational deletion of the strongest downstream structural connection.</li>
          </ul>
          <button 
            onClick={handleRun} 
            disabled={running || !selectedCircuit}
            className="w-full mt-4 bg-cyan-900/50 hover:bg-cyan-800/80 border border-cyan-700 text-cyan-300 font-bold p-3 transition disabled:opacity-50"
          >
            {running ? 'EXECUTING (100 SIMULATIONS)...' : 'RUN COMPUTATIONAL EXPERIMENT'}
          </button>
        </div>

        {results && (
          <div className="bg-gray-900/80 p-3 border border-cyan-900 mt-4">
            <span className="bg-blue-900/50 text-blue-400 px-2 py-0.5 border border-blue-800 text-[10px]">SIMULATED RESULTS</span>
            <div className="mt-2 text-[10px] text-gray-300 space-y-1 mb-3">
              <p><strong>Experiment ID:</strong> {results.experiment_id}</p>
              <p><strong>Ablated Edge:</strong> {results.ablated_edge ? `${results.ablated_edge.source} → ${results.ablated_edge.target}` : 'None'}</p>
            </div>
            
            <div className="mb-4">
              <span className="bg-purple-900/50 text-purple-400 px-2 py-0.5 border border-purple-800 text-[10px]">COMPUTATIONAL SENSITIVITY CURVE</span>
              <div className="mt-2 bg-black border border-gray-800 p-2 relative h-48 w-full">
                {/* SVG Graph */}
                <svg width="100%" height="100%" viewBox="0 -10 100 120" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#333" strokeWidth="0.5" />
                  ))}
                  
                  {/* Data Points and Lines */}
                  {(() => {
                    const noAblation = results.conditions.filter((c: any) => c.ablation_status === "NO_ABLATION");
                    const withAblation = results.conditions.filter((c: any) => c.ablation_status === "COMPUTATIONAL_ABLATION");
                    
                    const maxFR = Math.max(...results.conditions.map((c: any) => c.mean_delta_rate_hz + c.std_delta_rate_hz), 1);
                    const scaleY = (val: number) => 100 - (val / maxFR) * 100;
                    const scaleX = (val: number) => (val / 5.0) * 90 + 5; // offset by 5%
                    
                    const renderLine = (data: any[], color: string, isDashed: boolean) => {
                      if (!data || data.length === 0) return null;
                      
                      const points = data.map(d => `${scaleX(d.modulation_mv)},${scaleY(d.mean_delta_rate_hz)}`).join(" ");
                      
                      return (
                        <g>
                          <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeDasharray={isDashed ? "4,4" : "none"} />
                          {data.map((d, i) => (
                            <g key={i}>
                              <line 
                                x1={scaleX(d.modulation_mv)} y1={scaleY(d.ci_low)} 
                                x2={scaleX(d.modulation_mv)} y2={scaleY(d.ci_high)} 
                                stroke={color} strokeWidth="1" 
                              />
                              <circle cx={scaleX(d.modulation_mv)} cy={scaleY(d.mean_delta_rate_hz)} r="2" fill={color} />
                            </g>
                          ))}
                        </g>
                      );
                    };
                    
                    return (
                      <>
                        {renderLine(noAblation, "#22d3ee", false)}  {/* Cyan */}
                        {renderLine(withAblation, "#ef4444", true)} {/* Red Dashed */}
                      </>
                    );
                  })()}
                </svg>
                {/* Labels */}
                <div className="absolute top-2 right-2 text-[8px] bg-black/80 p-1 border border-gray-800">
                   <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-cyan-400"></div> NO_ABLATION</div>
                   <div className="flex items-center gap-1"><div className="w-2 h-0.5 border-t border-dashed border-red-500"></div> COMPUTATIONAL_ABLATION</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-gray-500 px-2 -mb-4">
                  <span>0mV</span><span>1mV</span><span>2mV</span><span>5mV</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-500 mt-5 italic text-center">x-axis: modulation_mv, y-axis: mean Δ firing rate (±95% CI)</p>
            </div>
            
            <table className="w-full text-left text-[9px] text-gray-300 border-collapse mt-4">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-1">Condition</th>
                  <th className="py-1">Mod(mV)</th>
                  <th className="py-1">Ablat?</th>
                  <th className="py-1">ΔFR</th>
                  <th className="py-1">±SD</th>
                </tr>
              </thead>
              <tbody>
                {results.conditions.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-1">{c.condition}</td>
                    <td className="py-1">{c.modulation_mv}</td>
                    <td className="py-1">{c.ablation_status === 'COMPUTATIONAL_ABLATION' ? 'Yes' : 'No'}</td>
                    <td className="py-1 font-bold text-cyan-300">{c.mean_delta_rate_hz.toFixed(2)}</td>
                    <td className="py-1 text-gray-500">±{c.std_delta_rate_hz.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-4 bg-gray-950 p-2 border border-gray-800">
              <strong className="text-gray-400 block mb-1">Provenance:</strong>
              <span className="text-cyan-500">{results.provenance}</span>
              
              <strong className="text-gray-400 block mt-2 mb-1">Assumptions:</strong>
              <ul className="text-gray-500 list-disc pl-4 space-y-1">
                {results.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
              
              <strong className="text-gray-400 block mt-2 mb-1">Limitations:</strong>
              <ul className="text-red-400/70 list-disc pl-4 space-y-1">
                {results.limitations.map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
