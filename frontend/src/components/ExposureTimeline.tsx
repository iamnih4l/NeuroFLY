import React from 'react';

interface TimelinePoint {
  timestamp: number;
  adaptation: number;
  habituation: number;
  dopamine: number;
}

interface ExposureTimelineProps {
  history: TimelinePoint[];
}

const ExposureTimeline: React.FC<ExposureTimelineProps> = ({ history }) => {
  if (!history || history.length === 0) return null;

  // We want to draw a simple sparkline for each of the 3 state variables
  // along the bottom of the screen.

  const maxPoints = 100;
  const displayHistory = history.slice(-maxPoints);

  const drawLine = (dataFn: (p: TimelinePoint) => number, color: string) => {
    if (displayHistory.length < 2) return null;
    
    const width = 1000;
    const height = 40;
    const dx = width / (displayHistory.length - 1);
    
    const points = displayHistory.map((p, i) => {
      const val = Math.max(0, Math.min(1, dataFn(p)));
      const x = i * dx;
      const y = height - (val * height);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10 preserve-3d overflow-visible" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          className="drop-shadow-[0_0_5px_currentColor]"
        />
      </svg>
    );
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[800px] bg-black/80 border border-gray-800 backdrop-blur-md p-4 flex flex-col font-mono z-10 pointer-events-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-cyan-500 font-bold tracking-widest text-sm">PERSISTENT STATE TIMELINE</h2>
        <div className="flex gap-4 text-[10px] font-bold">
          <span className="text-pink-500">MODULATORY</span>
          <span className="text-green-500">ADAPTATION</span>
          <span className="text-orange-500">HABITUATION</span>
        </div>
      </div>
      
      <div className="relative w-full h-10 border-b border-l border-gray-800">
        <div className="absolute inset-0 opacity-80">
           {drawLine(p => p.habituation, '#f97316')}
        </div>
        <div className="absolute inset-0 opacity-80">
           {drawLine(p => p.adaptation, '#22c55e')}
        </div>
        <div className="absolute inset-0 opacity-100">
           {drawLine(p => p.dopamine, '#ec4899')}
        </div>
      </div>
      <div className="flex justify-between text-gray-500 text-[10px] mt-1">
        <span>T - {displayHistory.length} EPOCHS</span>
        <span>CURRENT</span>
      </div>
    </div>
  );
};

export default ExposureTimeline;
