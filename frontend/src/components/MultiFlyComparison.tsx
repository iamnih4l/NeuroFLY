import React, { useState } from 'react';
import FlyTVScene from './FlyTVScene';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ConnectomeVisualizer from './ConnectomeVisualizer';

interface MultiFlyComparisonProps {
  multiflyState: any[];
  experimentId: string | null;
  fitViewTrigger: number;
  onFitView: () => void;
}

const MultiFlyComparison: React.FC<MultiFlyComparisonProps> = ({ multiflyState, experimentId, fitViewTrigger, onFitView }) => {
  const [lookInsideTrigger, setLookInsideTrigger] = useState<number>(0);

  // If no state yet, show loading
  if (!multiflyState || multiflyState.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#020406] z-50 text-cyan-500 font-mono tracking-widest animate-pulse">
        INITIALIZING REAL-TIME MULTI-FLY COMPARISON...
      </div>
    );
  }

  // Define offsets for the 3 instances
  // We offset them in X space so they appear side-by-side
  const offsets: [number, number, number][] = [
    [-60, 0, 0], // Left
    [0, 0, 0],   // Center
    [60, 0, 0]   // Right
  ];

  return (
    <div className="absolute inset-0 flex flex-col bg-[#020406] z-40 overflow-hidden font-mono">
      
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-800 flex justify-between items-center bg-black/50">
        <div className="text-cyan-500 text-[12px] font-bold tracking-widest">
          REAL-TIME MULTI-FLY COMPARISON
        </div>
        <button 
          onClick={onFitView}
          className="px-3 py-1 bg-gray-900/80 border border-gray-700 text-cyan-400 text-[10px] font-bold tracking-widest hover:bg-gray-800 transition-colors"
        >
          FIT ALL CONNECTOMES
        </button>
      </div>

      {/* Top Half: Fly TV and Metrics per Fly */}
      <div className="h-[45%] flex border-b border-gray-800">
        {multiflyState.map((fly, idx) => (
          <div key={fly.fly_id || idx} className="flex-1 flex flex-col border-r border-gray-800 last:border-r-0 relative overflow-hidden bg-black/40">
            
            {/* Fly Label */}
            <div className="absolute top-2 left-2 z-20 text-[10px] font-bold tracking-widest bg-black/60 px-2 py-1 border border-gray-800 text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              FLY 0{idx + 1} &mdash; {fly.topic_name}
            </div>

            {/* TV Scene */}
            <div className="h-[60%] relative border-b border-gray-800">
              {fly.error ? (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 text-[10px] tracking-widest bg-black">
                  VISUAL INPUT UNAVAILABLE
                </div>
              ) : (
                <FlyTVScene 
                  newsItem={fly.news_item}
                  isWatching={true}
                  features={fly.features}
                  onLookInside={() => setLookInsideTrigger(prev => prev + 1)}
                />
              )}
            </div>

            {/* Mini Metrics */}
            <div className="h-[40%] p-2 overflow-y-auto text-[9px] tracking-widest text-gray-400 flex flex-col gap-1">
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span>SPIKE COUNT:</span>
                <span className="text-cyan-400 font-bold">{fly.simulation?.total_spikes || 0}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span>ACTIVE NEURONS:</span>
                <span className="text-cyan-400 font-bold">{fly.simulation?.active_neurons || 0}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span>NOVELTY:</span>
                <span className="text-white">{fly.features?.novelty?.toFixed(3) || '0.000'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span>ADAPTATION:</span>
                <span className="text-green-500">{fly.neuro_state?.adaptation?.toFixed(3) || '0.000'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span>HABITUATION:</span>
                <span className="text-orange-500">{fly.neuro_state?.habituation?.toFixed(3) || '0.000'}</span>
              </div>
              
              {/* Dopamine Visualization */}
              <div className="mt-1 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>COMPUTATIONAL DOPAMINE STATE:</span>
                  <span className="text-pink-500">{fly.neuro_state?.last_dopamine_level?.toFixed(3) || '0.000'}</span>
                </div>
                <div className="w-full h-1 bg-gray-900 overflow-hidden">
                  <div 
                    className="h-full bg-pink-500 transition-all duration-500" 
                    style={{ width: `${Math.min(100, (fly.neuro_state?.last_dopamine_level || 0) * 50)}%` }}
                  />
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Bottom Half: 3D Visualization */}
      <div className="h-[55%] relative">
        <div className="absolute top-2 left-4 z-10 text-[10px] font-bold tracking-widest pointer-events-none text-gray-500">
          REAL MALECNS ACTIVITY (Synchronized Comparative View)
        </div>
        
        <Canvas camera={{ position: [0, 0, 70], fov: 45 }}>
          <color attach="background" args={['#010203']} />
          <OrbitControls 
            enablePan={true} 
            maxDistance={150} 
            minDistance={5}
            autoRotate={false}
          />
          
          {multiflyState.map((fly, idx) => {
             // If error, don't render a connectome for this slot (or render zero activity)
             const spikes = fly.error ? 0 : (fly.simulation?.total_spikes || 0);
             const activeIds = fly.error ? [] : (fly.simulation?.active_neuron_ids || []);
             return (
               <ConnectomeVisualizer 
                 key={fly.fly_id || idx}
                 experimentId={experimentId} 
                 currentEpoch={0}
                 onSelectNeuron={() => {}} 
                 visualMode="LOCAL"
                 targetBodyId={"125080"}
                 lookInsideTrigger={lookInsideTrigger}
                 fitViewTrigger={fitViewTrigger}
                 activityLevel={spikes}
                 positionOffset={offsets[idx]}
                 activeNeuronIds={activeIds}
               />
             );
          })}
        </Canvas>
      </div>

    </div>
  );
};

export default MultiFlyComparison;
