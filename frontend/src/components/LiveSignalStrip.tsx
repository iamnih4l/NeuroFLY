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

interface LiveSignalStripProps {
  history: TimelinePoint[];
}

const LiveSignalStrip: React.FC<LiveSignalStripProps> = ({ history }) => {
  if (!history || history.length === 0) return null;

  const maxPoints = 200;
  const displayHistory = history.slice(-maxPoints);

  const drawLine = (dataFn: (p: TimelinePoint) => number, color: string, maxValue = 1) => {
    if (displayHistory.length < 2) return null;
    
    const width = 1200;
    const height = 24;
    const dx = width / (displayHistory.length - 1);
    
    const points = displayHistory.map((p, i) => {
      const val = Math.max(0, Math.min(1, dataFn(p) / maxValue));
      const x = i * dx;
      const y = height - (val * height);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d overflow-visible" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          points={points}
          className="drop-shadow-[0_0_2px_currentColor]"
        />
      </svg>
    );
  };

  const maxSpikes = Math.max(10, ...displayHistory.map(p => p.spikes));

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/90 border-t border-gray-800 backdrop-blur-md px-6 py-2 flex items-center gap-6 font-mono z-10 pointer-events-auto">
      <div className="w-32 flex-shrink-0 text-[10px] text-gray-500 font-bold tracking-widest leading-tight">
        LIVE NEURAL<br/>SIGNALS
      </div>
      
      <div className="flex-1 flex flex-col gap-[2px]">
        
        {/* Strip 1: Neural Activity */}
        <div className="flex items-center gap-2 h-4">
          <span className="text-[8px] text-blue-500 w-20 text-right">NEURAL ACT.</span>
          <div className="flex-1 h-full relative opacity-80 border-b border-gray-800/30">
             {drawLine(p => p.spikes, '#3b82f6', maxSpikes)}
          </div>
        </div>

        {/* Strip 2: Dopaminergic */}
        <div className="flex items-center gap-2 h-4">
          <span className="text-[8px] text-pink-500 w-20 text-right">DOPAMINERGIC</span>
          <div className="flex-1 h-full relative opacity-80 border-b border-gray-800/30">
             {drawLine(p => p.dopamine, '#ec4899')}
          </div>
        </div>

        {/* Strip 3: Novelty */}
        <div className="flex items-center gap-2 h-4">
          <span className="text-[8px] text-cyan-500 w-20 text-right">NOVELTY</span>
          <div className="flex-1 h-full relative opacity-80 border-b border-gray-800/30">
             {drawLine(p => p.novelty, '#06b6d4')}
          </div>
        </div>

        {/* Strip 4: Salience */}
        <div className="flex items-center gap-2 h-4">
          <span className="text-[8px] text-yellow-500 w-20 text-right">SALIENCE</span>
          <div className="flex-1 h-full relative opacity-80">
             {drawLine(p => p.salience, '#eab308')}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LiveSignalStrip;
