import React from 'react';

interface NeuroState {
  adaptation: number;
  habituation: number;
  cumulative_exposure: number;
  last_dopamine_level: number;
}

interface FlyStatePanelProps {
  state: NeuroState | null;
  features: Record<string, number> | null;
}

const ProgressBar = ({ label, value, color }: { label: string, value: number, color: string }) => {
  const percentage = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="flex items-center gap-2 text-xs mb-2">
      <div className="w-24 text-gray-400">{label}</div>
      <div className="flex-1 h-2 bg-gray-900 border border-gray-800 relative">
        <div 
          className={`absolute left-0 top-0 bottom-0 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="w-12 text-right text-gray-500 font-mono">
        {value.toFixed(2)}
      </div>
    </div>
  );
};

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const FlyStatePanel: React.FC<FlyStatePanelProps> = ({ state, features }) => {
  if (!state) return null;

  return (
    <div className="absolute left-4 bottom-8 w-80 bg-black/80 border border-gray-800 backdrop-blur-md p-4 flex flex-col font-mono z-10 pointer-events-auto">
      <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
        <h2 className="text-purple-500 font-bold tracking-widest text-sm">FLY STATE</h2>
      </div>

      <div className="flex flex-col gap-1 mb-4">
        {features && (
          <>
            <ProgressBar label="Novelty" value={features.novelty || 0} color="bg-cyan-500" />
            <ProgressBar label="Sem. Salience" value={features.semantic_salience || 0} color="bg-yellow-500" />
            <ProgressBar label="Vis. Complexity" value={features.visual_complexity || 0} color="bg-blue-500" />
          </>
        )}
        <ProgressBar label="Modulatory" value={state.last_dopamine_level} color="bg-pink-500" />
        <ProgressBar label="Adaptation" value={state.adaptation} color="bg-green-500" />
        <ProgressBar label="Habituation" value={state.habituation} color="bg-orange-500" />
      </div>

      <div className="mt-2 pt-3 border-t border-gray-800 text-xs text-gray-400 flex justify-between">
        <span>Exposure:</span>
        <span className="text-white">{formatDuration(state.cumulative_exposure)}</span>
      </div>
    </div>
  );
};

export default FlyStatePanel;
