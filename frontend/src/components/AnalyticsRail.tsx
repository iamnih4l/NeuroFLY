import React from 'react';

interface NeuroState {
  adaptation: number;
  habituation: number;
  cumulative_exposure: number;
  last_dopamine_level: number;
}

interface AnalyticsRailProps {
  newsItem: any;
  state: NeuroState | null;
  features: Record<string, number> | null;
  simulation: any;
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const AnalyticsRail: React.FC<AnalyticsRailProps> = ({ newsItem, state, features, simulation }) => {
  return (
    <div className="flex flex-col gap-4 w-64 text-gray-400 text-xs font-mono">
      
      {/* Current Input */}
      <div className="bg-black/60 border border-gray-800 p-3">
        <h3 className="text-gray-500 font-bold mb-2 border-b border-gray-800 pb-1">CURRENT INPUT</h3>
        <div className="grid grid-cols-2 gap-y-1">
          <span>SOURCE</span><span className="text-white truncate text-right">{newsItem?.source || '--'}</span>
          <span>CATEGORY</span><span className="text-white text-right">{newsItem?.category || '--'}</span>
          <span>MEDIA</span><span className="text-white text-right">{newsItem?.imageUrl ? 'Image' : 'Text'}</span>
          <span>RECEIVED</span><span className="text-white text-right">{newsItem ? new Date().toLocaleTimeString() : '--'}</span>
        </div>
      </div>

      {/* Current State */}
      <div className="bg-black/60 border border-gray-800 p-3">
        <h3 className="text-gray-500 font-bold mb-2 border-b border-gray-800 pb-1">CURRENT STATE</h3>
        <div className="grid grid-cols-2 gap-y-1">
          <span>NOVELTY</span><span className="text-cyan-400 text-right">{features?.novelty?.toFixed(3) || '--'}</span>
          <span>SALIENCE</span><span className="text-yellow-400 text-right">{features?.semantic_salience?.toFixed(3) || '--'}</span>
          <span>ADAPTATION</span><span className="text-green-400 text-right">{state?.adaptation?.toFixed(3) || '--'}</span>
          <span>HABITUATION</span><span className="text-orange-400 text-right">{state?.habituation?.toFixed(3) || '--'}</span>
        </div>
      </div>

      {/* Neural Response */}
      <div className="bg-black/60 border border-gray-800 p-3">
        <h3 className="text-gray-500 font-bold mb-2 border-b border-gray-800 pb-1">NEURAL RESPONSE</h3>
        <div className="grid grid-cols-2 gap-y-1">
          <span>ACTIVE CIRCUIT</span><span className="text-white text-right">Mushroom Body</span>
          <span>ACTIVE NEURONS</span><span className="text-white text-right">{simulation?.active_neurons || 0}</span>
          <span>TOTAL SPIKES</span><span className="text-white text-right">{simulation?.total_spikes || 0}</span>
          <span>MODULATORY</span><span className="text-pink-400 text-right">{state?.last_dopamine_level?.toFixed(3) || '--'}</span>
        </div>
      </div>

      {/* Exposure Stats */}
      <div className="bg-black/60 border border-gray-800 p-3">
        <h3 className="text-gray-500 font-bold mb-2 border-b border-gray-800 pb-1">EXPOSURE</h3>
        <div className="grid grid-cols-2 gap-y-1">
          <span>SESSION</span><span className="text-white text-right">{state ? formatDuration(state.cumulative_exposure) : '--'}</span>
          <span>INPUTS PROCESSED</span><span className="text-white text-right">{state ? Math.floor(state.cumulative_exposure / 10) : 0}</span>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsRail;
