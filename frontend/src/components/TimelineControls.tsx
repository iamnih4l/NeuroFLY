import { useEffect, useState } from 'react';

interface TimelineProps {
  experimentId: string;
  currentEpoch: number;
  maxEpoch: number;
  onEpochChange: (e: number | ((prev: number) => number)) => void;
  onMaxEpochChange: (e: number | ((prev: number) => number)) => void;
}

export default function TimelineControls({ experimentId, currentEpoch, maxEpoch, onEpochChange, onMaxEpochChange }: TimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Fetch total epochs
    fetch(`http://localhost:3001/api/metrics?experiment_id=${experimentId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          onMaxEpochChange(data[data.length - 1].epoch);
        }
      })
      .catch(console.error);
  }, [experimentId, onMaxEpochChange]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        onEpochChange((prev: number) => {
          if (prev >= maxEpoch) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500); // 500ms per epoch
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxEpoch, onEpochChange]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[600px] bg-gray-900/90 border border-gray-700 backdrop-blur-md p-4 flex flex-col pointer-events-auto z-50">
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>EXPERIMENT TIMELINE</span>
        <span className="font-mono text-cyan-400">EPOCH: {currentEpoch} / {maxEpoch}</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          className="text-white hover:text-cyan-400 bg-gray-800 px-3 py-1 rounded"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        
        <input 
          type="range" 
          min={0} 
          max={maxEpoch} 
          value={currentEpoch}
          onChange={(e) => {
            setIsPlaying(false);
            onEpochChange(parseInt(e.target.value));
          }}
          className="w-full accent-cyan-500 cursor-pointer"
        />
      </div>
    </div>
  );
}
