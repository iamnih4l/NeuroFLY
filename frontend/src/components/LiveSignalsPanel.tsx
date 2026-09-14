import React from 'react';

interface TimelinePoint {
  timestamp: number;
  adaptation: number;
  habituation: number;
  dopamine: number;
  novelty: number;
  salience: number;
  spikes: number;
}

interface LiveSignalsPanelProps {
  history: TimelinePoint[];
}

const Sparkline = ({ data, color, label, maxValue = 1 }: { data: number[], color: string, label: string, maxValue?: number }) => {
  if (!data || data.length < 2) {
    return (
      <div className="flex justify-between items-center h-8">
        <span className="text-[10px] text-gray-500 w-24 truncate">{label}</span>
        <div className="flex-1 h-[1px] bg-gray-800 ml-2"></div>
      </div>
    );
  }

  const width = 200;
  const height = 24;
  const dx = width / (data.length - 1);
  
  const points = data.map((val, i) => {
    const normalized = Math.max(0, Math.min(1, val / maxValue));
    const x = i * dx;
    const y = height - (normalized * height);
    return `${x},${y}`;
  }).join(' ');

  const currentVal = data[data.length - 1];

  return (
    <div className="flex justify-between items-center h-8">
      <span className="text-[10px] text-gray-400 w-24 truncate">{label}</span>
      <div className="flex-1 ml-2 relative h-6 border-b border-gray-800/50">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            points={points}
            className="drop-shadow-[0_0_2px_currentColor]"
          />
        </svg>
      </div>
      <span className="w-8 text-right text-[10px] ml-2 text-gray-300">
        {currentVal.toFixed(2)}
      </span>
    </div>
  );
};

const LiveSignalsPanel: React.FC<LiveSignalsPanelProps> = ({ history }) => {
  const maxPoints = 120; // 30-120 seconds roughly if 1 tick per second, but we have 15s ticks so this is a long time
  const displayHistory = history.slice(-maxPoints);

  const getSeries = (key: keyof TimelinePoint) => displayHistory.map(p => p[key] as number);

  // Normalize spikes dynamically
  const maxSpikes = Math.max(10, ...getSeries('spikes'));

  return (
    <div className="flex flex-col gap-1 w-[340px] bg-black/60 border border-gray-800 p-3 font-mono">
      <h3 className="text-gray-500 font-bold mb-2 border-b border-gray-800 pb-1 text-xs tracking-widest">LIVE SIGNALS</h3>
      
      <Sparkline data={getSeries('spikes')} color="#3b82f6" label="NEURAL ACTIVITY" maxValue={maxSpikes} />
      <Sparkline data={getSeries('dopamine')} color="#ec4899" label="DOPAMINERGIC" />
      <Sparkline data={getSeries('novelty')} color="#06b6d4" label="NOVELTY" />
      <Sparkline data={getSeries('salience')} color="#eab308" label="SALIENCE" />
      <Sparkline data={getSeries('adaptation')} color="#22c55e" label="ADAPTATION" />
      <Sparkline data={getSeries('habituation')} color="#f97316" label="HABITUATION" />
      
      <div className="flex justify-between text-[8px] text-gray-600 mt-2 border-t border-gray-800/50 pt-1">
        <span>T - {displayHistory.length * 15}s</span>
        <span>CURRENT</span>
      </div>
    </div>
  );
};

export default LiveSignalsPanel;
